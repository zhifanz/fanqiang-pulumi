import { interpolate } from "@pulumi/pulumi";
import { ServiceEndpoint } from "../domain";
import {
  AlicloudTunnelServiceSupport,
  currentRegion,
} from "../alicloud/AlicloudTunnelServiceSupport";
import { AlicloudEciContainerGroup } from "../alicloud/AlicloudEciContainerGroup";

export class AlicloudEciSocatTunnel
  extends AlicloudTunnelServiceSupport
  implements ServiceEndpoint
{
  static async newInstanceWithCurrentRegion(
    name: string,
    upstream: ServiceEndpoint
  ): Promise<AlicloudEciSocatTunnel> {
    return new AlicloudEciSocatTunnel(await currentRegion(), name, upstream);
  }

  constructor(regionId: string, name: string, upstream: ServiceEndpoint) {
    super("fanqiang:alicloud:AlicloudEciSocatTunnel", name, upstream.port);
    new AlicloudEciContainerGroup(
      regionId,
      name,
      {
        securityGroupId: this.securityGroup.id,
        vSwitchId: this.vSwitch.id,
        containerGroupName: "socat-tunnel",
        eipInstanceId: this.eip.id,
        cpu: 1,
        memory: 2,
        container: {
          name: "socat",
          image: "alpine/socat",
          command: [
            "-d",
            "-d",
            "-d",
            "-D",
            `TCP4-LISTEN:${upstream.port},fork,reuseaddr`,
            upstream.ipv6Address
              ? interpolate`TCP6:[${upstream.ipv6Address}]:${upstream.port}`
              : interpolate`TCP:${upstream.ipAddress}:${upstream.port}`,
          ],
          port: upstream.port,
        },
      },
      { parent: this }
    );
  }
}
