import {
  CloudObjectPath,
  ProxyConnectionProperties,
  ProxyProperties,
  ProxyRegion,
} from "./Configuration";
import { Host } from "./Host";
import { FluentbitOutput } from "./RuleAnalyzer";

export type ProxyServerFactory = (
  props: ProxyProperties,
  opts?: { region?: ProxyRegion; publicKeys?: string[] }
) => Host;
export type ForwardProxyFactory = (
  originalService: Host,
  port: number,
  ...publicKeys: string[]
) => Host;
export type RouterFactory = (
  defaultProxy: ProxyConnectionProperties,
  port: number,
  opts?: {
    additionalProxies?: Record<string, ProxyConnectionProperties>;
    fluentbitOutput?: FluentbitOutput;
    publicKeys?: string[];
  }
) => Host & {
  ipRule: {
    domestic: CloudObjectPath;
    additionalProxies?: Record<string, CloudObjectPath>;
  };
};
