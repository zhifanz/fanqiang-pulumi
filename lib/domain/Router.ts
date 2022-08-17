import * as pulumi from "@pulumi/pulumi";
import { ProxyServer } from "./ProxyServer";

import { ServiceEndpoints } from "./ServiceEndpoints";

export interface RouterFactory {
  (proxyServer: ProxyServer, publicKey?: string): Router;
}

export interface Router extends ServiceEndpoints {
  readonly protocol: pulumi.Output<string>;
}
