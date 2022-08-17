import { createSharedResources } from "./core/common";
import * as pulumi from "@pulumi/pulumi";
import {
  InfrastructureConstructionResult,
  MinimalInfrastructureConstructionService,
  ModerateInfrastructureConstructionService,
  PremiumInfrastructureConstructionService,
} from "./domain/InfrastructureConstructionService";
import { createLightsailShadowsocksProxy } from "./core/proxy/LightsailShadowsocksProxy";
import { ClashClientConfiguration } from "./core/client";
import { createAlicloudEcsNginxTunnel } from "./core/tunnel/AlicloudEcsNginxTunnelConstructor";
import { getRouterFactory } from "./core/tunnel/AlicloudEcsClashTunnelConstructor";
import { EndpointDebugging } from "./domain/EndpointDebugging";

export function apply(): InfrastructureConstructionResult {
  const stackConfig = new pulumi.Config();
  const encryption = stackConfig.require("encryption");
  const password = stackConfig.require("password");
  const sharedResources = createSharedResources(stackConfig.require("bucket"));
  let result = undefined;
  let proxyFactory = createLightsailShadowsocksProxy;
  const vpnClient = new ClashClientConfiguration(sharedResources.bucket);
  const publicKey = stackConfig.get("publicKey");
  let debugging;
  if (publicKey) {
    debugging = new EndpointDebugging(publicKey);
    proxyFactory = debugging.interceptProxyServerFactory(proxyFactory);
  }

  switch (stackConfig.require("scale")) {
    case "minimal":
      result = new MinimalInfrastructureConstructionService(
        proxyFactory,
        vpnClient
      ).constructInfrastructure(encryption, password);
      break;
    case "moderate":
      result = new ModerateInfrastructureConstructionService(
        proxyFactory,
        debugging
          ? debugging.interceptForwardProxyFactory(createAlicloudEcsNginxTunnel)
          : createAlicloudEcsNginxTunnel,
        vpnClient
      ).constructInfrastructure(encryption, password);
      break;
    case "premium":
      const routerFactory = getRouterFactory(sharedResources.bucket);
      result = new PremiumInfrastructureConstructionService(
        proxyFactory,
        debugging
          ? debugging.interceptRouterFactory(routerFactory)
          : routerFactory,
        vpnClient
      ).constructInfrastructure(encryption, password);
      break;
    default:
      throw new Error("Unknown scale type: " + stackConfig.require("scale"));
  }

  return result;
}
