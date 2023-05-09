import * as aws from "@pulumi/aws";
import { ShadowsocksProperties, ShadowsocksServer } from "./ShadowsocksServer";
import { extractContinent } from "../aws/utils";

export class MultiRegionProxyCluster {
  readonly default: ShadowsocksServer;
  readonly extra: Record<string, ShadowsocksServer> = {};

  constructor(props: ShadowsocksProperties, extraRegions: aws.Region[]) {
    this.default = new ShadowsocksServer(props);
    extraRegions.forEach((region) => {
      this.extra[extractContinent(region)] = new ShadowsocksServer(
        props,
        region
      );
    });
  }
}
