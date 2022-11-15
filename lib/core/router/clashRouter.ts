import * as pulumi from "@pulumi/pulumi";
import * as path from "node:path";
import * as yaml from "yaml";
import { BucketOperations } from "../aws/BucketOperations";
import { AgentUser } from "../aws/AgentUser";
import { CloudServer } from "../alicloud/CloudServer";
import { ProxyConnectionProperties } from "../../domain/Configuration";
import { FluentbitOutput } from "../../domain/RuleAnalyzer";
import { RouterFactory } from "../../domain/Factories";
import { DEFAULT_RESOURCE_NAME } from "../utils";

export class ClashRouterFactory extends pulumi.ComponentResource {
  constructor(readonly bucketOperations: BucketOperations) {
    super("ClashRouter", DEFAULT_RESOURCE_NAME);
  }
  createClashRouter: RouterFactory = (defaultProxy, port, opts) => {
    const dependsOn: pulumi.Resource[] = [];
    const agentUser = new AgentUser();
    const clashConfig = new ClashConfig(
      this.bucketOperations,
      dependsOn,
      port,
      defaultProxy,
      opts?.additionalProxies
    );
    dependsOn.push(
      agentUser.allowAccess(
        "s3",
        "s3:*",
        this.bucketOperations.bucketArn,
        pulumi.concat(this.bucketOperations.bucketArn, "/*")
      )
    );
    dependsOn.push(
      this.bucketOperations.uploadSource(
        "router/docker-compose.yml",
        path.join(__dirname, "docker-compose.yml"),
        { parent: this }
      )
    );

    dependsOn.push(
      this.bucketOperations.uploadContent(
        "router/config.yaml",
        clashConfig.toString(),
        { parent: this }
      )
    );
    dependsOn.push(
      this.bucketOperations.uploadContent(
        "router/fluent-bit.conf",
        fluentbitConf(opts?.fluentbitOutput),
        { parent: this }
      )
    );
    dependsOn.push(
      this.bucketOperations.uploadSource(
        "router/fluent-bit-parsers.conf",
        path.join(__dirname, "fluent-bit-parsers.conf"),
        { parent: this }
      )
    );
    clashConfig.prepareRuleFiles(this);

    const server = new CloudServer(
      opts?.publicKeys?.length ? { clash: port, ssh: 22 } : { clash: port },
      {
        provisionInstance: (p) => {
          if (opts?.publicKeys) {
            opts.publicKeys.forEach((k) => p.addPublicKey(k));
          }
          p.configureAccessKey(
            agentUser.accessKeyId,
            agentUser.accessKeySecret
          );
          p.copyS3Dir(
            `s3://${this.bucketOperations.bucketName}/router`,
            "/opt/clash"
          );
          p.addDockerComposeFile("/opt/clash/docker-compose.yml");
        },
        dependsOn: dependsOn,
        parent: this,
      }
    );

    return { ipAddress: server.ipAddress, ipRule: clashConfig.getRuleFiles() };
  };
}

class ClashConfig {
  constructor(
    readonly bucketOperations: BucketOperations,
    readonly dependsOn: pulumi.Resource[],
    readonly listeningPort: number,
    readonly defaultProxy: ProxyConnectionProperties,
    readonly additionalProxies?: Record<string, ProxyConnectionProperties>
  ) {}

  private static getRuleSetFileName(region: string): string {
    return region + "-domains.yml";
  }

  private static getCloudObjectPath(region: string): string {
    return "clash/rules/" + ClashConfig.getRuleSetFileName(region);
  }

  prepareRuleFiles(parent: pulumi.Resource) {
    this.prepareRuleFile("domestic", parent);
    if (this.additionalProxies) {
      for (const region in this.additionalProxies) {
        this.prepareRuleFile(region, parent);
      }
    }
  }

  private prepareRuleFile(region: string, parent: pulumi.Resource) {
    const result = this.bucketOperations.uploadContent(
      ClashConfig.getCloudObjectPath(region),
      yaml.stringify({ payload: ["placeholder.noop"] }),
      {
        parent,
        publicRead: true,
      }
    );
    this.dependsOn.push(result);
    return result;
  }

  getRuleFiles() {
    const result: ReturnType<RouterFactory>["ipRule"] = {
      domestic: ClashConfig.getCloudObjectPath("domestic"),
    };
    if (this.additionalProxies) {
      result.additionalProxies = {};
      for (const region in this.additionalProxies) {
        result.additionalProxies[region] =
          ClashConfig.getCloudObjectPath(region);
      }
    }
    return result;
  }

  toString(): pulumi.Output<string> {
    return pulumi
      .all([pulumi.all(this.proxies()), pulumi.all(this.ruleProviders())])
      .apply(([proxies, ruleProviders]) => {
        const config = {
          "mixed-port": this.listeningPort,
          "allow-lan": true,
          "bind-address": "*",
          mode: "rule",
          proxies: proxies,
          "rule-providers": ruleProviders,
          rules: this.rules(),
        };
        return yaml.stringify(config);
      });
  }

  private proxies() {
    const result = [this.proxy("auto", this.defaultProxy)];
    if (this.additionalProxies) {
      Object.entries(this.additionalProxies).forEach(([k, v]) =>
        result.push(this.proxy(k, v))
      );
    }
    return result;
  }

  private proxy(name: string, props: ProxyConnectionProperties) {
    return props.ipAddress.apply((ip) => ({
      name: name,
      type: "ss",
      server: ip,
      port: props.port,
      cipher: props.encryption,
      password: props.password,
    }));
  }

  private ruleProviders() {
    const result: Record<string, ReturnType<ClashConfig["ruleProvider"]>> = {
      domestic: this.ruleProvider("domestic"),
    };
    for (const name in this.additionalProxies) {
      result[name] = this.ruleProvider(name);
    }
    return result;
  }

  private ruleProvider(region: string) {
    return this.bucketOperations
      .getUrl(ClashConfig.getCloudObjectPath(region))
      .apply((url) => ({
        type: "http",
        behavior: "domain",
        path: ClashConfig.getRuleSetFileName(region),
        url,
        interval: 300,
      }));
  }

  private rules() {
    const result = [
      "RULE-SET,domestic,DIRECT",
      "GEOIP,CN,DIRECT",
      "MATCH,auto",
    ];
    if (this.additionalProxies) {
      for (const name in this.additionalProxies) {
        result.splice(0, 0, `RULE-SET,${name},${name}`);
      }
    }
    return result;
  }
}

function fluentbitConf(output?: FluentbitOutput): pulumi.Output<string> {
  let result = pulumi.output(`
[SERVICE]
  parsers_file /fluent-bit/etc/fluent-bit-parsers.conf

[INPUT]
  name forward

[FILTER]
  name parser
  match *
  key_name log
  parser info
  
[OUTPUT]
`);
  output = output || { Name: "stdout", Match: "*" };
  for (const k in output) {
    result = pulumi.concat(result, "  ", k, " ", output[k], "\n");
  }
  return result;
}
