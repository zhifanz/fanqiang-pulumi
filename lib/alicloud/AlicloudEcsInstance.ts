import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { Host } from "../domain";
import { AlicloudTunnelServiceSupport } from "./AlicloudTunnelServiceSupport";

export class AlicloudEcsInstance
  extends AlicloudTunnelServiceSupport
  implements Host
{
  private readonly ecs: alicloud.ecs.Instance;
  constructor(name: string, port: number, userData: pulumi.Input<string>) {
    super("fanqiang:alicloud:AlicloudEcsInstance", name, port);
    this.ecs = new alicloud.ecs.Instance(
      name,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [this.securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: this.vSwitch.id,
        spotStrategy: "SpotAsPriceGo",
        systemDiskCategory: "cloud_efficiency",
        systemDiskSize: 40,
        userData: pulumi
          .output(userData)
          .apply((script) => Buffer.from(script).toString("base64")),
        ipv6AddressCount: 1,
      },
      { parent: this }
    );
    new alicloud.ecs.EipAssociation(name, {
      allocationId: this.eip.id,
      instanceId: this.ecs.id,
    });
    super.configIpv6InternetBandwidth(name, this.ecs, this.ecs.id);
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }

  get ipv6Address(): pulumi.Output<string> {
    return this.ecs.ipv6Addresses[0];
  }
}
