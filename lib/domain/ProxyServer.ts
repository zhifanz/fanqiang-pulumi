import * as pulumi from "@pulumi/pulumi";

import { ServiceEndpoints } from "./ServiceEndpoints";

export interface ProxyServerFactory {
  (encryption: string, password: string, publicKey?: string): ProxyServer;
}

export interface ProxyServer extends ServiceEndpoints {
  readonly encryption: pulumi.Output<string>;
  readonly password: pulumi.Output<string>;
}
