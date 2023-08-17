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
import { Host } from "./domain";

type Configuration = ShadowsocksProperties & {
  bucket: string;
  requireTunnel: boolean;
  enableIpv6: boolean;
};

function loadConfiguration(): Configuration {
  const stackConfig = new pulumi.Config();
  return {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: process.env.FANQIANG_PASSWORD || parsePassword(stackConfig),
    port: stackConfig.requireNumber("port"),
    bucket: process.env.FANQIANG_BUCKET || stackConfig.require("bucket"),
    requireTunnel: requireTunnel(stackConfig),
    enableIpv6: !!stackConfig.getBoolean("enableIpv6"),
  };
}

function requireTunnel(config: pulumi.Config) {
  if (process.env.FANQIANG_REQUIRE_TUNNEL == "true") {
    return true;
  }
  if (process.env.FANQIANG_REQUIRE_TUNNEL == "false") {
    return false;
  }
  return config.requireBoolean("requireTunnel");
}

function parsePassword(config: pulumi.Config) {
  return config.get("password") || crypto.randomBytes(8).toString("base64");
}

export async function apply() {
  const cf = loadConfiguration();
  const bucketOperations = new BucketOperations(cf.bucket);
  let endpoint: Host = new ShadowsocksServer(cf);
  if (cf.requireTunnel) {
    endpoint = new AlicloudEciSocatTunnel("socat-tunnel", {
      ipAddress: endpoint.ipAddress,
      ipv6Address: endpoint.ipv6Address,
      port: cf.port,
    });
  }
  const configObject = bucketOperations.uploadContent(
    "clash/config.yaml",
    (cf.enableIpv6
      ? <pulumi.Output<string>>endpoint.ipv6Address
      : endpoint.ipAddress
    ).apply((host) => client.render(cf, host))
  );
  return {
    clientConfigUrl: bucketOperations.getUrl(configObject.key),
  };
}
