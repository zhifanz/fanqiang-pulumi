import * as pulumi from "@pulumi/pulumi";
import * as infrastructure from "./domain/InfrastructureConstruction";
import { ClashClientConfiguration } from "./core/client";
import { createNginxTunnel } from "./core/nginxTunnel";
import { ClashRouterFactory } from "./core/router/clashRouter";
import { EndpointDebugging } from "./core/EndpointDebugging";
import { Configuration, Encryption, ProxyRegion } from "./domain/Configuration";
import { BucketOperations } from "./core/aws/BucketOperations";
import { createPostgresInternetAccessEventRepository } from "./core/analysis/PostgresInternetAccessEventRepository";
import { NoOpAnalyzer } from "./core/analysis/NoopAnalyzer";
import { createShadowsocksServer } from "./core/shadowsocksServer";

interface ApplicationContext extends Configuration {
  interceptors?: EndpointDebugging;
  bucketOperations: BucketOperations;
}

function configureFactoryInterceptors(
  ac: ApplicationContext,
  publicKey: string
): void {
  ac.interceptors = new EndpointDebugging(publicKey);
  ac.proxyServerFactory = ac.interceptors.interceptProxyServerFactory(
    ac.proxyServerFactory
  );
  if (ac.intermediate) {
    if (ac.intermediate instanceof Function) {
      ac.intermediate = ac.interceptors.interceptForwardProxyFactory(
        ac.intermediate
      );
    } else {
      ac.intermediate.routerFactory = ac.interceptors.interceptRouterFactory(
        ac.intermediate.routerFactory
      );
    }
  }
}

function loadApplicationContext(): ApplicationContext {
  const stackConfig = new pulumi.Config();
  const ac: ApplicationContext = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
    bucketOperations: new BucketOperations(stackConfig.require("bucket")),
    proxyServerFactory: createShadowsocksServer,
    vpnClientConfigurationTemplate: new ClashClientConfiguration(),
  };

  let additionalProxyRegions: ProxyRegion[] | undefined;
  switch (stackConfig.require("scale")) {
    case "moderate":
      ac.intermediate = createNginxTunnel;
      break;
    case "ultimate":
      additionalProxyRegions = ["us-east-1", "ap-northeast-1", "eu-central-1"];
    case "premium":
      ac.intermediate = {
        createEventRepo: () =>
          createPostgresInternetAccessEventRepository(ac.password),
        createAnalyzer: new NoOpAnalyzer().apply,
        routerFactory: new ClashRouterFactory(ac.bucketOperations)
          .createClashRouter,
        additionalProxyRegions,
      };
  }
  if (stackConfig.get("publicKey")) {
    configureFactoryInterceptors(ac, stackConfig.require("publicKey"));
  }
  return ac;
}

export function apply() {
  const ac = loadApplicationContext();
  const ruleObject = ac.bucketOperations.uploadContent(
    "clash/config.yaml",
    infrastructure.generateVpnConfig(ac),
    { publicRead: true }
  );
  let result = { clientConfigUrl: ac.bucketOperations.getUrl(ruleObject.key) };
  if (ac.interceptors) {
    result = { ...result, ...ac.interceptors.hosts };
  }
  return result;
}
