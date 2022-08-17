import * as pulumi from "@pulumi/pulumi";
import { ProxyServer } from "./ProxyServer";
import { Router } from "./Router";

export interface VpnClientConfigurationTemplate {
  basic(proxyServer: ProxyServer): pulumi.Output<string>;
  rules(router: Router): pulumi.Output<string>;
}
