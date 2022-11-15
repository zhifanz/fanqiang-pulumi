import * as pulumi from "@pulumi/pulumi";
import { Host } from "../domain/Host";
import { CloudServer } from "./alicloud/CloudServer";

export function createNginxTunnel(
  upstreamService: Host,
  port: number,
  ...publicKeys: string[]
): Host {
  return new CloudServer(
    publicKeys.length ? { ssh: 22, nginx: port } : { nginx: port },
    {
      provisionInstance: (cloudinit) => {
        publicKeys.forEach(cloudinit.addPublicKey);
        cloudinit.ensureInternetAccess();
        cloudinit.addCommand(scripts.setupNginx(upstreamService, port));
      },
    }
  );
}

const scripts = {
  setupNginx: (upstreamService: Host, port: number) => pulumi.interpolate`
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
    listen ${port};
    proxy_pass ${upstreamService.ipAddress}:${port};
  }
}
EOF
systemctl start nginx
`,
} as const;
