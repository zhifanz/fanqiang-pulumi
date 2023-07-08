import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { BucketOperations } from "./aws/BucketOperations";
import {
  ShadowsocksProperties,
  ShadowsocksServer,
} from "./proxy/ShadowsocksServer";
import * as client from "./client/configuration";
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
  bucketOperations: BucketOperations;
  ssprops: ShadowsocksProperties;
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
