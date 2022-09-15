import * as pulumi from "@pulumi/pulumi";
import * as path from "node:path";
import { Router } from "../domain/Router";
import { ProxyServer } from "../domain/ProxyServer";
import { BucketOperations } from "./aws/BucketOperations";
import { RequestRoutingRuleAnalysis } from "./analysis/RequestRoutingRuleAnalysis";
import { AgentUser } from "./aws/AgentUser";
import { randomPassword } from "./utils";
import { CloudServer } from "./alicloud/CloudServer";
import { InstanceConfigurer } from "./InstanceConfigurer";

export class ClashRouterFactory {
  constructor(
    readonly bucketOperations: BucketOperations,
    readonly requireAnalysis: boolean = true
  ) {}
  createClashRouter = (
    proxyServer: ProxyServer,
    publickKey?: string
  ): Router => {
    const agentUser = new AgentUser();
    agentUser.allowAccess(
      "s3",
      "s3:*",
      this.bucketOperations.bucketArn,
      pulumi.concat(this.bucketOperations.bucketArn, "/*")
    );
    const instanceConfigurer = new InstanceConfigurer();
    this.bucketOperations.uploadSource(
      "router/docker-compose.yml",
      path.join(__dirname, "docker-compose.yml")
    );
    this.bucketOperations.uploadContent(
      "router/config.yaml",
      clashConf(7890, proxyServer)
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
    if (this.requireAnalysis) {
      const analysisResources = new RequestRoutingRuleAnalysis(
        agentUser,
        this.bucketOperations,
        "default",
        "fanqiang",
        "admin",
        randomPassword(16)
      );
      analysisResources.configureInstance(instanceConfigurer);
    }

    const server = new CloudServer(
      instanceConfigurer.toShellScript(),
      publickKey
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
