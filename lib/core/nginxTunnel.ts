import * as pulumi from "@pulumi/pulumi";
import { ServiceEndpoints } from "../domain/ServiceEndpoints";
import { CloudServer } from "./alicloud/CloudServer";

export function createNginxTunnel(
  service: ServiceEndpoints,
  publicKey?: string
): ServiceEndpoints {
  const server = new CloudServer(cloudInitScript(service), publicKey);
  server.openPort("app", service.port);
  return { port: service.port, host: server.publicIpAddress };
}

function cloudInitScript(
  upstreamService: ServiceEndpoints
): pulumi.Output<string> {
  return pulumi.interpolate`
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
    listen ${upstreamService.port};
    proxy_pass ${upstreamService.host}:${upstreamService.port};
  }
}
EOF
systemctl start nginx
`;
}
