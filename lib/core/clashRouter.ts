import * as pulumi from "@pulumi/pulumi";
import * as path from "node:path";
import { Router } from "../domain/Router";
import { ProxyServer } from "../domain/ProxyServer";
import { BucketOperations } from "./aws/BucketOperations";
import { RequestRoutingRuleAnalysis } from "./analysis/RequestRoutingRuleAnalysis";
import { AgentUser } from "./aws/AgentUser";
import { CloudServer } from "./alicloud/CloudServer";
import { InstanceProvision } from "./InstanceProvision";

export class ClashRouterFactory {
  constructor(
    readonly bucketOperations: BucketOperations,
    readonly analysisProperties?: { username: string; password: string }
  ) {}
  createClashRouter = (
    proxyServer: ProxyServer,
    publickKey?: string
  ): Router => {
    const dependsOn = [];
    const agentUser = new AgentUser();
    dependsOn.push(
      agentUser.allowAccess(
        "s3",
        "s3:*",
        this.bucketOperations.bucketArn,
        pulumi.concat(this.bucketOperations.bucketArn, "/*")
      )
    );
    const instanceConfigurer = new InstanceProvision();
    dependsOn.push(
      this.bucketOperations.uploadSource(
        "router/docker-compose.yml",
        path.join(__dirname, "docker-compose.yml")
      )
    );
    dependsOn.push(
      this.bucketOperations.uploadContent(
        "router/config.yaml",
        clashConf(7890, proxyServer)
      )
    );
    instanceConfigurer.configureAwsAccessKey(
      agentUser.accessKeyId,
      agentUser.accessKeySecret
    );
    instanceConfigurer.s3CopyDir(
      pulumi.concat(this.bucketOperations.bucketName, "/router"),
      "/opt/clash"
    );
    const dc = instanceConfigurer.configureDockerCompose("/opt/clash");
    dc.addFile("docker-compose.yml");
    dc.addService("clash");
    if (this.analysisProperties) {
      const analysisResources = new RequestRoutingRuleAnalysis(
        agentUser,
        this.bucketOperations,
        "fanqiang",
        this.analysisProperties.username,
        this.analysisProperties.password
      );
      analysisResources.configureInstance(instanceConfigurer);
      dependsOn.push(analysisResources);
    }

    const server = new CloudServer(
      instanceConfigurer.toShellScript(),
      publickKey,
      dependsOn
    );
    server.openPort("clash", 7890);
    return {
      port: pulumi.output(7890),
      host: server.publicIpAddress,
      protocol: pulumi.output("socks5"),
    };
  };
}

function clashConf(
  port: pulumi.Input<number>,
  server: ProxyServer
): pulumi.Output<string> {
  return pulumi.interpolate`
mixed-port: ${port}
allow-lan: true
bind-address: '*'
mode: rule
proxies:
- name: auto
  type: ss
  server: ${server.host}
  port: ${server.port}
  cipher: ${server.encryption}
  password: ${server.password}
rules:
- GEOIP,CN,DIRECT
- MATCH,auto
`;
}
