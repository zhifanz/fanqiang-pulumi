import * as pulumi from "@pulumi/pulumi";
import {
  ForwardProxyFactory,
  ProxyServerFactory,
  RouterFactory,
} from "../domain/Factories";

export class EndpointDebugging {
  readonly hosts: Record<string, pulumi.Output<string>> = {};
  constructor(readonly publicKey: string) {}

  interceptProxyServerFactory(factory: ProxyServerFactory): ProxyServerFactory {
    return (arg0, arg1) => {
      const result = factory(arg0, {
        region: arg1?.region,
        publicKeys: [...(arg1?.publicKeys || []), this.publicKey],
      });
      if (arg1?.region) {
        this.hosts[`proxy-${arg1?.region}`] = result.ipAddress;
      } else {
        this.hosts.defaultProxy = result.ipAddress;
      }
      return result;
    };
  }

  interceptForwardProxyFactory(
    factory: ForwardProxyFactory
  ): ForwardProxyFactory {
    return (arg0, arg1, ...pks) => {
      const result = factory(arg0, arg1, ...pks, this.publicKey);
      this.hosts.forwardProxy = result.ipAddress;
      return result;
    };
  }

  interceptRouterFactory(factory: RouterFactory): RouterFactory {
    return (arg0, arg1, arg2) => {
      const result = factory(arg0, arg1, {
        additionalProxies: arg2?.additionalProxies,
        fluentbitOutput: arg2?.fluentbitOutput,
        publicKeys: [...(arg2?.publicKeys || []), this.publicKey],
      });
      this.hosts.router = result.ipAddress;
      return result;
    };
  }
}
