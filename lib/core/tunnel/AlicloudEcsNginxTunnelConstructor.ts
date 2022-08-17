import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { AlicloudEcsTunnelConstructor } from "./AlicloudEcsTunnelConstructor";
import { ServiceEndpoints } from "../../domain/ServiceEndpoints";

export function createAlicloudEcsNginxTunnel(
  originalService: ServiceEndpoints,
  publicKey?: string
): ServiceEndpoints {
  const infra = new AlicloudEcsNginxTunnelConstructor(
    originalService,
    "100",
    "10",
    publicKey
  );
  return { port: originalService.port, host: infra.apply().publicIpAddress };
}

export class AlicloudEcsNginxTunnelConstructor extends AlicloudEcsTunnelConstructor {
  constructor(
    private readonly proxy: ServiceEndpoints,
    readonly bandwidth: string,
    readonly maxPrice: string,
    readonly publicKey?: string
  ) {
    super();
  }
  get port(): pulumi.Input<number> {
    return this.proxy.port;
  }
  protected cloudInitScript(
    eip: alicloud.ecs.EipAddress
  ): pulumi.Output<string> {
    return pulumi.interpolate`${super.cloudInitScript(eip)}
yum install -y nginx nginx-all-modules
cat > /etc/nginx/nginx.conf <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
include /usr/share/nginx/modules/*.conf;
events {
  worker_connections 1024;
}
stream {
  server {
    listen ${this.proxy.port};
    proxy_pass ${this.proxy.host}:${this.proxy.port};
  }
}
EOF
systemctl start nginx
`;
  }
}
