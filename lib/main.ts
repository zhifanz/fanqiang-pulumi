import * as pulumi from "@pulumi/pulumi";
import * as crypto from "node:crypto";
import { BucketOperations } from "./aws/BucketOperations";
import {
  Encryption,
  ShadowsocksProperties,
  ShadowsocksServer,
} from "./proxy/ShadowsocksServer";
import * as client from "./client/configuration";
import { AlicloudEciSocatTunnel } from "./forwardtunnel/AlicloudEciSocatTunnel";
import { Host, ServiceEndpoint } from "./domain";
import { AlicloudEcsSocatTunnel } from "./forwardtunnel/AlicloudEcsSocatTunnel";
import { currentRegion } from "./alicloud/AlicloudTunnelServiceSupport";
import { create as createVpnServer } from "./proxy/AwsLightsailLibreswanVpnServer";

type Configuration = ShadowsocksProperties & {
  bucket: string;
  mode: "vpn" | "tunnelproxy" | "dual";
  tunnelType?: "ecs" | "eci";
};

function loadConfiguration(): Configuration {
  const stackConfig = new pulumi.Config();
  return {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: process.env.FANQIANG_PASSWORD || parsePassword(stackConfig),
    port: stackConfig.requireNumber("port"),
    bucket: process.env.FANQIANG_BUCKET || stackConfig.require("bucket"),
    mode: stackConfig.require("mode"),
    tunnelType: stackConfig.get("tunnelType"),
  };
}

function parsePassword(config: pulumi.Config) {
  return config.get("password") || crypto.randomBytes(8).toString("base64");
}

export async function apply() {
  const cf = loadConfiguration();
  const bucketOperations = new BucketOperations(cf.bucket);
  const result: any = {};
  if (cf.mode == "vpn" || cf.mode == "dual") {
    const vpnServer = createVpnServer(bucketOperations);
    result.vpnApple = vpnServer.clientConfigurations.Apple;
    result.vpnAndroid = vpnServer.clientConfigurations.Android;
    result.vpnWindows = vpnServer.clientConfigurations.Windows;
  }
  if (cf.mode == "tunnelproxy" || cf.mode == "dual") {
    let endpoint: Host = new ShadowsocksServer(cf);
    if (cf.tunnelType) {
      const upstream: ServiceEndpoint = {
        ipAddress: endpoint.ipAddress,
        ipv6Address: endpoint.ipv6Address,
        port: cf.port,
      };
      if (cf.tunnelType == "eci") {
        endpoint = new AlicloudEciSocatTunnel(
          await currentRegion(),
          "socat-tunnel",
          upstream
        );
      } else {
        endpoint = new AlicloudEcsSocatTunnel("socat-tunnel", upstream);
      }
    }
    const configObject = bucketOperations.uploadContent(
      "clash/config.yaml",
      endpoint.ipAddress.apply((host) => client.render(cf, host))
    );
    result.tunnelProxy = bucketOperations.getUrl(configObject.key);
  }
  return result;
}
