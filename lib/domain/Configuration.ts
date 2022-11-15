import {
  ForwardProxyFactory,
  ProxyServerFactory,
  RouterFactory,
} from "./Factories";
import { Host } from "./Host";
import {
  AnalyzerConstructFunction,
  InternetAccessEventRepository,
} from "./RuleAnalyzer";
import { VpnClientConfigurationTemplate } from "./VpnClientConfigurationTemplate";

export type ProxyRegion =
  | "us-east-1"
  | "us-east-2"
  | "us-west-2"
  | "ap-south-1"
  | "ap-northeast-2"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ap-northeast-1"
  | "ca-central-1"
  | "eu-central-1"
  | "eu-west-1"
  | "eu-west-2"
  | "eu-west-3"
  | "eu-north-1";

export type Encryption =
  | "plain"
  | "aes-128-gcm"
  | "aes-256-gcm"
  | "chacha20-ietf-poly1305";

export interface ProxyProperties {
  encryption: Encryption;
  password: string;
  port: number;
}
export type ProxyConnectionProperties = ServiceEndpoint & {
  encryption: Encryption;
  password: string;
};
export type ServiceEndpoint = Host & {
  port: number;
};
export type CloudObjectPath = string;
export interface Configuration extends ProxyProperties {
  proxyServerFactory: ProxyServerFactory;
  intermediate?:
    | ForwardProxyFactory
    | {
        createEventRepo: () => InternetAccessEventRepository;
        createAnalyzer: AnalyzerConstructFunction;
        routerFactory: RouterFactory;
        additionalProxyRegions?: ProxyRegion[];
      };
  vpnClientConfigurationTemplate: VpnClientConfigurationTemplate;
}
