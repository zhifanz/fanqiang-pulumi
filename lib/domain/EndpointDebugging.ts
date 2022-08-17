import * as pulumi from "@pulumi/pulumi";
import { ForwardProxyFactory } from "./ForwardProxy";
import { ProxyServer, ProxyServerFactory } from "./ProxyServer";
import { RouterFactory } from "./Router";
import { ServiceEndpoints } from "./ServiceEndpoints";

export class EndpointDebugging {
  readonly hosts: {
    proxyServers: pulumi.Output<string>[];
    forwardProxies: pulumi.Output<string>[];
    routers: pulumi.Output<string>[];
  };
  constructor(readonly publicKey: string) {
    this.hosts = {
      proxyServers: [],
      forwardProxies: [],
      routers: [],
    };
  }

  interceptProxyServerFactory(factory: ProxyServerFactory): ProxyServerFactory {
    return (arg0: string, arg1: string): ProxyServer => {
      const result = factory(arg0, arg1, this.publicKey);
      this.hosts.proxyServers.push(result.host);
      return result;
    };
  }

  interceptForwardProxyFactory(
    factory: ForwardProxyFactory
  ): ForwardProxyFactory {
    return (arg0: ServiceEndpoints): ServiceEndpoints => {
      const result = factory(arg0, this.publicKey);
      this.hosts.forwardProxies.push(result.host);
      return result;
    };
  }

  interceptRouterFactory(factory: RouterFactory): RouterFactory {
    return (arg0: ProxyServer) => {
      const result = factory(arg0, this.publicKey);
      this.hosts.routers.push(result.host);
      return result;
    };
  }
}
