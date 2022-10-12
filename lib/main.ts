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
import { createNginxTunnel } from "./core/nginxTunnel";
import { ClashRouterFactory } from "./core/clashRouter";
import { EndpointDebugging } from "./domain/EndpointDebugging";

export function apply(): InfrastructureConstructionResult {
  const stackConfig = new pulumi.Config();
  const encryption = stackConfig.require("encryption");
  const password = stackConfig.require("password");
  const sharedResources = createSharedResources(stackConfig.require("bucket"));
  let result = undefined;
  let proxyFactory = createLightsailShadowsocksProxy;
  const vpnClient = new ClashClientConfiguration(sharedResources.bucket.bucket);
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
          ? debugging.interceptForwardProxyFactory(createNginxTunnel)
          : createNginxTunnel,
        vpnClient
      ).constructInfrastructure(encryption, password);
      break;
    case "premium":
      const routerFactory = new ClashRouterFactory(sharedResources.bucket, {
        username: stackConfig.require("username"),
        password,
      });
      result = new PremiumInfrastructureConstructionService(
        proxyFactory,
        debugging
          ? debugging.interceptRouterFactory(routerFactory.createClashRouter)
          : routerFactory.createClashRouter,
        vpnClient
      ).constructInfrastructure(encryption, password);
      break;
    default:
      throw new Error("Unknown scale type: " + stackConfig.require("scale"));
  }

  return result;
}
