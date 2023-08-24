import { AlicloudEcsInstance } from "../alicloud/AlicloudEcsInstance";
import { ServiceEndpoint } from "../domain";
import { render } from "../jinja/templates";

export class AlicloudEciSocatTunnel extends AlicloudEcsInstance {
  constructor(name: string, upstream: ServiceEndpoint) {
    super(name, upstream.port, userData(upstream));
  }
}

function userData(upstream: ServiceEndpoint) {
  return upstream.ipv6Address.apply((remoteHost) =>
    render("cloud-init.j2", { port: upstream.port, remoteHost })
  );
}