import * as domain from "./domain";
import * as common from "./common";
import * as client from "./client";
import * as proxy from "./proxy";
import * as tunnel from "./tunnel";
import * as pulumi from "@pulumi/pulumi";
import { DEFAULT_RESOURCE_NAME } from "./utils";

export async function apply() {
  const stackConfig = new pulumi.Config();
  const config = {
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
    encryption: stackConfig.require("encryption"),
    bandwidth: stackConfig.require("bandwidth"),
    maxPrice: stackConfig.require("maxPrice"),
    publicKey: stackConfig.get("publicKey"),
  };
  const scale: domain.InfraScale = stackConfig.require("scale");
  const result: Record<string, pulumi.Output<any>> = {};
  const bucket = common.apply(stackConfig.require("bucket")).bucket;
  const proxyResult = new proxy.LightsailShadowsocksProxy(
    DEFAULT_RESOURCE_NAME,
    bucket,
    config,
    config.publicKey
  );
  let publicIpAddress = proxyResult.publicIpAddress;
  result.proxyIpAddress = publicIpAddress;
  if (scale == "moderate") {
    const tunnelResult = new tunnel.AlicloudEcsNginxTunnel(
      DEFAULT_RESOURCE_NAME,
      { host: publicIpAddress, port: config.port },
      config,
      config.publicKey
    );
    publicIpAddress = tunnelResult.publicIpAddress;
    result.tunnelIpAddress = publicIpAddress;
  }
  const clientResult = client.apply(bucket, {
    host: publicIpAddress,
    ...config,
  });
  return { ...result, ...clientResult };
}
