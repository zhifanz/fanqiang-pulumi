import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { Ansible } from "./Ansible";
import { BucketOperations } from "./aws/BucketOperations";
import { ShadowsocksProperties, ShadowsocksServer } from "./proxy/shadowsocks";
import * as client from "./client/configuration";
import { NginxTunnel } from "./forwardtunnel/NginxTunnel";
import { ClashRouter } from "./router/ClashRouter";
import { ProxyCluster } from "./proxy/cluster";

type ApplyResult = { clientConfigUrl: pulumi.Output<string> };
export interface Context {
  tmpdir: string;
  ansible: Ansible;
  bucketOperations: BucketOperations;
  ssprops: ShadowsocksProperties;
  publicKeys: string[];
}

export function minimal(context: Context): ApplyResult {
  const proxy = new ShadowsocksServer(
    context.ssprops,
    context.ansible,
    ...context.publicKeys
  );
  const configObject = context.bucketOperations.uploadContent(
    "clash/config.yaml",
    proxy.ipAddress.apply((host) =>
      client.render({ ...context.ssprops, host })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: context.bucketOperations.getUrl(configObject.key) };
}

export function moderate(context: Context): ApplyResult {
  const proxy = new ShadowsocksServer(
    context.ssprops,
    context.ansible,
    ...context.publicKeys
  );
  const tunnel = new NginxTunnel(
    context.ansible,
    { ipAddress: proxy.ipAddress, port: context.ssprops.port },
    ...context.publicKeys
  );
  const configObject = context.bucketOperations.uploadContent(
    "clash/config.yaml",
    tunnel.ipAddress.apply((host) =>
      client.render({ ...context.ssprops, host })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: context.bucketOperations.getUrl(configObject.key) };
}

export function premium(context: Context): ApplyResult {
  const proxy = new ShadowsocksServer(
    context.ssprops,
    context.ansible,
    ...context.publicKeys
  );
  const router = new ClashRouter(
    context.ansible,
    context.bucketOperations,
    { props: context.ssprops, hosts: { default: proxy.ipAddress } },
    {
      name: "fanqiang",
      user: "guanliyuan",
      password: context.ssprops.password,
    },
    ...context.publicKeys
  );
  const configObject = context.bucketOperations.uploadContent(
    "clash/config.yaml",
    router.ipAddress.apply((host) =>
      client.render({ host, port: context.ssprops.port })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: context.bucketOperations.getUrl(configObject.key) };
}

export function ultimate(context: Context): ApplyResult {
  const proxyCluster = new ProxyCluster(
    context.ssprops,
    context.ansible,
    ["ap-northeast-1", "eu-central-1"],
    ...context.publicKeys
  );
  const router = new ClashRouter(
    context.ansible,
    context.bucketOperations,
    {
      props: context.ssprops,
      hosts: {
        default: proxyCluster.default.ipAddress,
        extra: _.mapValues(proxyCluster.extra, (v) => v.ipAddress),
      },
    },
    {
      name: "fanqiang",
      user: "guanliyuan",
      password: context.ssprops.password,
    },
    ...context.publicKeys
  );
  const configObject = context.bucketOperations.uploadContent(
    "clash/config.yaml",
    router.ipAddress.apply((host) =>
      client.render({ host, port: context.ssprops.port })
    ),
    { publicRead: true }
  );
  return { clientConfigUrl: context.bucketOperations.getUrl(configObject.key) };
}
