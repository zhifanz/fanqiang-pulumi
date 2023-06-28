import { AlicloudEciContainerGroup } from "../alicloud/AlicloudEciContainerGroup";
import { ServiceEndpoint } from "../domain";
import * as pulumi from "@pulumi/pulumi";

export class AlicloudEciSocatTunnel extends AlicloudEciContainerGroup {
  constructor(name: string, upstream: ServiceEndpoint) {
    super(name, upstream.port, {
      image: "alpine/socat",
      args: [
        `TCP4-LISTEN:${upstream.port},fork,reuseaddr`,
        pulumi.interpolate`TCP4:${upstream.ipAddress}:${upstream.port}`,
      ],
    });
  }
}
