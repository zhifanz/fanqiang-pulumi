import * as pulumi from "@pulumi/pulumi";
import { ForwardProxyFactory } from "./ForwardProxy";
import { ProxyServerFactory } from "./ProxyServer";
import { RouterFactory } from "./Router";

import { VpnClientConfigurationTemplate } from "./VpnClientConfigurationTemplate";

export type ProxyParams = { encryption: string; password: string };

export type InfrastructureConstructionResult = {
  clientConfigLink: pulumi.Output<string>;
};
export interface InfrastructureConstructionService {
  constructInfrastructure(
    config: pulumi.Config
  ): InfrastructureConstructionResult;
}

export class MinimalInfrastructureConstructionService {
  constructor(
    readonly createProxyServer: ProxyServerFactory,
    readonly vpnClient: VpnClientConfigurationTemplate
  ) {}

  constructInfrastructure(
    encryption: string,
    password: string
  ): InfrastructureConstructionResult {
    const proxyServer = this.createProxyServer(encryption, password);
    return { clientConfigLink: this.vpnClient.basic(proxyServer) };
  }
}

export class ModerateInfrastructureConstructionService {
  constructor(
    readonly createProxyServer: ProxyServerFactory,
    readonly createForwardProxy: ForwardProxyFactory,
    readonly vpnClient: VpnClientConfigurationTemplate
  ) {}

  constructInfrastructure(
    encryption: string,
    password: string
  ): InfrastructureConstructionResult {
    const proxyServer = this.createProxyServer(encryption, password);
    const forwardProxy = this.createForwardProxy(proxyServer);
    return {
      clientConfigLink: this.vpnClient.basic({
        encryption: proxyServer.encryption,
        password: proxyServer.password,
        ...forwardProxy,
      }),
    };
  }
}

export class PremiumInfrastructureConstructionService {
  constructor(
    readonly createProxyServer: ProxyServerFactory,
    readonly createRouter: RouterFactory,
    readonly vpnClient: VpnClientConfigurationTemplate
  ) {}

  constructInfrastructure(
    encryption: string,
    password: string
  ): InfrastructureConstructionResult {
    const proxyServer = this.createProxyServer(encryption, password);
    const router = this.createRouter(proxyServer);
    return { clientConfigLink: this.vpnClient.rules(router) };
  }
}
