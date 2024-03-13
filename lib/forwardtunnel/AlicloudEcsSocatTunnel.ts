import { AlicloudEcsInstance } from "../alicloud/AlicloudEcsInstance";
import { ServiceEndpoint } from "../domain";
import { render } from "../jinja/templates";
import * as pulumi from "@pulumi/pulumi";

export class AlicloudEcsSocatTunnel extends AlicloudEcsInstance {
  constructor(name: string, upstream: ServiceEndpoint, password?: string) {
    super(name, upstream.port, userData(upstream), password);
  }
}

function userData(upstream: ServiceEndpoint) {
  return (
    upstream.ipv6Address
      ? pulumi.concat("[", upstream.ipv6Address, "]")
      : upstream.ipAddress
  ).apply((remoteHost) =>
    render("cloud-init.j2", { port: upstream.port, remoteHost })
  );
}
