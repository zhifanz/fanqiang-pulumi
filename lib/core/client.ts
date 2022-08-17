import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { VpnClientConfigurationTemplate } from "../domain/VpnClientConfigurationTemplate";
import { ProxyServer } from "../domain/ProxyServer";
import { Router } from "../domain/Router";

export class ClashClientConfiguration
  implements VpnClientConfigurationTemplate
{
  constructor(readonly bucket: aws.s3.Bucket) {}
  basic(proxyServer: ProxyServer): pulumi.Output<string> {
    return this.generateURL(basicConfiguration(proxyServer));
  }
  rules(router: Router): pulumi.Output<string> {
    return this.generateURL(routerConfiguration(router));
  }

  private generateURL(content: pulumi.Output<string>): pulumi.Output<string> {
    const obj = new aws.s3.BucketObject("clashConfiguration", {
      bucket: this.bucket.id,
      key: "clash/config.yaml",
      forceDestroy: true,
      content: content,
      acl: "public-read",
    });
    return pulumi.concat(
      "https://",
      this.bucket.bucketDomainName,
      "/",
      obj.key
    );
  }
}

function basicConfiguration(params: ProxyServer): pulumi.Output<string> {
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
    server: ${params.host}
    port: ${params.port}
    cipher: ${params.encryption}
    password: ${params.password}
rules:
  - GEOIP,CN,DIRECT
  - MATCH,auto
`;
}

function routerConfiguration(params: Router): pulumi.Output<string> {
  return pulumi.interpolate`
mixed-port: 7890
mode: global
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
    type: ${params.protocol}
    server: ${params.host}
    port: ${params.port}
rules:
  - MATCH,auto  
`;
}
