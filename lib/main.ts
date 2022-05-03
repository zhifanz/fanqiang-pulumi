import * as domain from "./domain";
import * as common from "./common";
import * as client from "./client";
import * as proxy from "./proxy";
import * as tunnel from "./tunnel";
import * as pulumi from "@pulumi/pulumi";

export async function apply(): Promise<client.ApplyResult> {
  const stackConfig = new pulumi.Config();
  const config: domain.ShadowsocksConfiguration & domain.TunnelConfiguration = {
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
    encryption: stackConfig.require("encryption"),
    bandwidth: stackConfig.require("bandwidth"),
    maxPrice: stackConfig.require("maxPrice"),
  };
  const scale: domain.InfraScale = stackConfig.require("scale");
  const bucket = common.apply(stackConfig.require("bucket")).bucket;
  const proxyResult = await proxy.apply(bucket, config);
  let publicIpAddress = proxyResult.publicIpAddress;
  if (scale == "moderate") {
    const tunnelResult = await tunnel.apply(
      publicIpAddress.apply((ip) => ({
        host: ip,
        port: config.port,
      })),
      config
    );
    publicIpAddress = tunnelResult.publicIpAddress;
  }
  return client.apply(
    bucket,
    publicIpAddress.apply((ip) => ({
      host: ip,
      ...config,
    }))
  );
}
