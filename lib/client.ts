import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as domain from "./domain";

export function apply(
  bucket: aws.s3.Bucket,
  shadowsocksConfig: domain.Input<domain.ShadowsocksServerConfiguration>
): { clashConfigUrl: pulumi.Output<string> } {
  const obj = new aws.s3.BucketObject("clashConfiguration", {
    bucket: bucket.id,
    key: "clash/fanqiang.yaml",
    forceDestroy: true,
    content: clashConfigurationFileContent(shadowsocksConfig),
    acl: "public-read",
  });
  return {
    clashConfigUrl: pulumi.concat(
      "https://",
      bucket.bucketDomainName,
      "/",
      obj.key
    ),
  };
}

function clashConfigurationFileContent(
  config: domain.Input<domain.ShadowsocksServerConfiguration>
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
    server: ${config.host}
    port: ${config.port}
    cipher: ${config.encryption}
    password: ${config.password}
rules:
  - GEOIP,CN,DIRECT
  - MATCH,auto
`;
}
