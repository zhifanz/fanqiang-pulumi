import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { Ansible } from "./Ansible";
import { BucketOperations } from "./aws/BucketOperations";
import {
  ShadowsocksProperties,
  ShadowsocksServer,
} from "./proxy/ShadowsocksServer";
import * as client from "./client/configuration";
import { ClashRouter } from "./router/ClashRouter";
import { MultiRegionProxyCluster } from "./proxy/MultiRegionProxyCluster";
import { Host } from "./domain";
import { AlicloudEciSocatTunnel } from "./forwardtunnel/AlicloudEciSocatTunnel";

type ApplyResult = {
  clientConfigUrl: pulumi.Output<string>;
  [k: string]: any;
};
type ApplyInfraResult = {
  clashParams: pulumi.Output<client.ClashParams>;
  [k: string]: any;
};
export interface Context {
  ansible: Ansible;
  bucketOperations: BucketOperations;
  ssprops: ShadowsocksProperties;
  publicKeys: string[];
}

export abstract class AbstractHandler {
  process(context: Context): ApplyResult {
    const outputs = this.applyInfra(context);
    const configObject = context.bucketOperations.uploadContent(
      "clash/config.yaml",
      outputs.clashParams.apply((v) => client.render(v))
    );
    return {
      clientConfigUrl: context.bucketOperations.getUrl(configObject.key),
      ..._.omit(outputs, ["clashParams"]),
    };
  }

  protected abstract applyInfra(context: Context): ApplyInfraResult;
}

export class Minimal extends AbstractHandler {
  protected applyInfra(context: Context): ApplyInfraResult {
    let host: Host = new ShadowsocksServer(context.ssprops);
    host = this.extendsProxy(context, host);
    const clashParams = host.ipAddress.apply((host) => ({
      ...context.ssprops,
      host,
    }));

    return { clashParams: clashParams };
  }

  protected extendsProxy(context: Context, proxy: Host): Host {
    return proxy;
  }
}

export class Moderate extends Minimal {
  protected extendsProxy(context: Context, proxy: Host): Host {
    return new AlicloudEciSocatTunnel("socat-tunnel", {
      ipAddress: proxy.ipAddress,
      port: context.ssprops.port,
    });
  }
}

abstract class RouterHandler extends AbstractHandler {
  protected applyInfra(context: Context): ApplyInfraResult {
    const router = new ClashRouter(
      context.ansible,
      context.bucketOperations,
      { props: context.ssprops, hosts: this.createProxies(context) },
      {
        name: "fanqiang",
        user: "guanliyuan",
        password: context.ssprops.password,
      },
      ...context.publicKeys
    );
    return {
      clashParams: router.ipAddress.apply((host) => ({
        host,
        port: context.ssprops.port,
      })),
      databaseEndpointAddress: router.clashLogDb.address,
      databaseEndpointPort: router.clashLogDb.port,
    };
  }

  protected abstract createProxies(
    context: Context
  ): ConstructorParameters<typeof ClashRouter>[2]["hosts"];
}

export class Premium extends RouterHandler {
  protected createProxies(context: Context) {
    const proxy = new ShadowsocksServer(context.ssprops);
    return { default: proxy.ipAddress };
  }
}

export class Ultimate extends RouterHandler {
  protected createProxies(context: Context) {
    const proxyCluster = new MultiRegionProxyCluster(context.ssprops, [
      "ap-northeast-1",
      "eu-central-1",
    ]);
    return {
      default: proxyCluster.default.ipAddress,
      extra: _.mapValues(proxyCluster.extra, (v) => v.ipAddress),
    };
  }
}
