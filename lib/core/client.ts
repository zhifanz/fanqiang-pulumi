import * as pulumi from "@pulumi/pulumi";
import { VpnClientConfigurationTemplate } from "../domain/VpnClientConfigurationTemplate";
import {
  ProxyConnectionProperties,
  ServiceEndpoint,
} from "../domain/Configuration";

export class ClashClientConfiguration
  implements VpnClientConfigurationTemplate
{
  basic(props: ProxyConnectionProperties): pulumi.Output<string> {
    return basicConfiguration(props);
  }
  rules(router: ServiceEndpoint): pulumi.Output<string> {
    return routerConfiguration(router);
  }
}

function basicConfiguration(
  props: ProxyConnectionProperties
): pulumi.Output<string> {
  return pulumi.interpolate`
mixed-port: 7890
mode: rule
tun:
  enable: true
  stack: system
  macOS-auto-route: true
  macOS-auto-detect-interface: true
dns:
  enable: true
  listen: 0.0.0.0:1053
  enhanced-mode: redir-host
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
    - tls://dns.rubyfish.cn:853
proxies:
  - name: auto
    type: ss
    server: ${props.ipAddress}
    port: ${props.port}
    cipher: ${props.encryption}
    password: ${props.password}
rules:
  - GEOIP,CN,DIRECT
  - MATCH,auto
`;
}

function routerConfiguration(router: ServiceEndpoint): pulumi.Output<string> {
  return pulumi.interpolate`
mixed-port: 7890
mode: rule
tun:
  enable: true
  stack: system
  macOS-auto-route: true
  macOS-auto-detect-interface: true
dns:
  enable: true
  listen: 0.0.0.0:1053
  enhanced-mode: redir-host
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
    - tls://dns.rubyfish.cn:853
proxies:
  - name: auto
    type: socks5
    server: ${router.ipAddress}
    port: ${router.port}
rules:
  - MATCH,auto  
`;
}
