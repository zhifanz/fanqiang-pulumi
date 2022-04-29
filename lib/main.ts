import * as common from "./common";
import * as client from "./client";
import * as proxy from "./proxy";
import * as pulumi from "@pulumi/pulumi";

export async function apply(): Promise<client.ApplyResult> {
  const stackConfig = new pulumi.Config();
  const shadowsocksConfig: proxy.ShadowsocksConfiguration = {
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
    encryption: stackConfig.require("encryption"),
  };
  const bucket = common.apply(stackConfig.require("bucket")).bucket;
  const proxyResult = await proxy.apply(bucket, shadowsocksConfig);
  const clientResult = await client.apply(
    bucket,
    proxyResult.publicIpAddress.apply((ip) => ({
      host: ip,
      ...shadowsocksConfig,
    }))
  );
  return clientResult;
}
