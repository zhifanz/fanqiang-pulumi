import * as pulumi from "@pulumi/pulumi";
import { ProxyConnectionProperties, ServiceEndpoint } from "./Configuration";

export interface VpnClientConfigurationTemplate {
  basic(props: ProxyConnectionProperties): pulumi.Output<string>;
  rules(router: ServiceEndpoint): pulumi.Output<string>;
}
