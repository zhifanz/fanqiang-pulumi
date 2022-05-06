import * as domain from "./domain";
import * as common from "./common";
import * as client from "./client";
import * as proxy from "./proxy";
import * as tunnel from "./tunnel";
import * as pulumi from "@pulumi/pulumi";
import { DEFAULT_RESOURCE_NAME } from "./utils";

export async function apply() {
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
  const proxyResult = new proxy.LightsailShadowsocksProxy(
    DEFAULT_RESOURCE_NAME,
    bucket,
    config
  );
  let publicIpAddress = proxyResult.publicIpAddress;
  if (scale == "moderate") {
    const tunnelResult = new tunnel.AlicloudEcsNginxTunnel(
      DEFAULT_RESOURCE_NAME,
      { host: publicIpAddress, port: config.port },
      config
    );
    publicIpAddress = tunnelResult.publicIpAddress;
  }
  return client.apply(bucket, { host: publicIpAddress, ...config });
}
