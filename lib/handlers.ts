import * as pulumi from "@pulumi/pulumi";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import _ from "lodash";
import { Ansible } from "./Ansible";
import { BucketOperations } from "./aws/BucketOperations";
import {
  Encryption,
  ShadowsocksProperties,
  ShadowsocksServer,
} from "./proxy/shadowsocks";
import * as client from "./client/configuration";
import { NginxTunnel } from "./forwardtunnel/NginxTunnel";
import { ClashRouter } from "./router/ClashRouter";
import { ProxyCluster } from "./proxy/cluster";
import { SingletonKeyPairHolder } from "./ssh";

type ApplyResult = { clientConfigUrl: pulumi.Output<string> };

export function minimal(stackConfig: pulumi.Config): ApplyResult {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new SingletonKeyPairHolder(tmpdir);
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ansible = new Ansible(keyPairHolder.get);
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
  };
  const publicKey = stackConfig.get("publicKey");
  const proxy = new ShadowsocksServer(
    ssprops,
    ansible,
    ..._.compact([publicKey])
  );
  const configObject = bucketOperations.uploadContent(
    "clash/config.yaml",
    proxy.ipAddress.apply((host) => client.render({ ...ssprops, host })),
    { publicRead: true }
  );
  return { clientConfigUrl: bucketOperations.getUrl(configObject.key) };
}

export function moderate(stackConfig: pulumi.Config): ApplyResult {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new SingletonKeyPairHolder(tmpdir);
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ansible = new Ansible(keyPairHolder.get);
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
  };
  const publicKey = stackConfig.get("publicKey");
  const proxy = new ShadowsocksServer(
    ssprops,
    ansible,
    ..._.compact([publicKey])
  );
  const tunnel = new NginxTunnel(
    ansible,
    { ipAddress: proxy.ipAddress, port: ssprops.port },
    ...(publicKey ? [publicKey] : [])
  );
  const configObject = bucketOperations.uploadContent(
    "clash/config.yaml",
    tunnel.ipAddress.apply((host) => client.render({ ...ssprops, host })),
    { publicRead: true }
  );
  return { clientConfigUrl: bucketOperations.getUrl(configObject.key) };
}

export function premium(stackConfig: pulumi.Config): ApplyResult {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new SingletonKeyPairHolder(tmpdir);
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ansible = new Ansible(keyPairHolder.get);
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
  };
  const publicKey = stackConfig.get("publicKey");
  const proxy = new ShadowsocksServer(
    ssprops,
    ansible,
    ..._.compact([publicKey])
  );
  const router = new ClashRouter(
    ansible,
    bucketOperations,
    { props: ssprops, hosts: { default: proxy.ipAddress } },
    { name: "fanqiang", user: "guanliyuan", password: ssprops.password },
    ...(publicKey ? [publicKey] : [])
  );
  const configObject = bucketOperations.uploadContent(
    "clash/config.yaml",
    router.ipAddress.apply((host) =>
      client.render({ host, port: ssprops.port })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: bucketOperations.getUrl(configObject.key) };
}

export function ultimate(stackConfig: pulumi.Config): ApplyResult {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new SingletonKeyPairHolder(tmpdir);
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ansible = new Ansible(keyPairHolder.get);
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
  };
  const publicKey = stackConfig.get("publicKey");
  const proxyCluster = new ProxyCluster(
    ssprops,
    ansible,
    ["ap-northeast-1", "eu-central-1"],
    ..._.compact([publicKey])
  );
  const router = new ClashRouter(
    ansible,
    bucketOperations,
    {
      props: ssprops,
      hosts: {
        default: proxyCluster.default.ipAddress,
        extra: _.mapValues(proxyCluster.extra, (v) => v.ipAddress),
      },
    },
    { name: "fanqiang", user: "guanliyuan", password: ssprops.password },
    ..._.compact([publicKey])
  );
  const configObject = bucketOperations.uploadContent(
    "clash/config.yaml",
    router.ipAddress.apply((host) =>
      client.render({ host, port: ssprops.port })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: bucketOperations.getUrl(configObject.key) };
}
