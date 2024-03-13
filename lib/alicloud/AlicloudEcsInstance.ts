import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { Host } from "../domain";
import { AlicloudTunnelServiceSupport } from "./AlicloudTunnelServiceSupport";

export class AlicloudEcsInstance
  extends AlicloudTunnelServiceSupport
  implements Host
{
  private readonly ecs: alicloud.ecs.Instance;
  constructor(
    name: string,
    port: number,
    userData: pulumi.Input<string>,
    password?: string
  ) {
    super("fanqiang:alicloud:AlicloudEcsInstance", name, port);
    this.ecs = new alicloud.ecs.Instance(
      name,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [this.securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: this.vSwitch.id,
        systemDiskCategory: "cloud_efficiency",
        systemDiskSize: 40,
        password,
        userData: pulumi
          .output(userData)
          .apply((script) => Buffer.from(script).toString("base64")),
        ipv6AddressCount: 1,
      },
      { parent: this }
    );
    if (password && port != 22) {
      new alicloud.ecs.SecurityGroupRule(
        `${name}-ssh`,
        {
          securityGroupId: this.securityGroup.id,
          ipProtocol: "tcp",
          type: "ingress",
          cidrIp: "0.0.0.0/0",
          portRange: "22/22",
        },
        { parent: this }
      );
    }
    new alicloud.ecs.EipAssociation(name, {
      allocationId: this.eip.id,
      instanceId: this.ecs.id,
    });
    new alicloud.vpc.Ipv6InternetBandwidth(
      name,
      {
        bandwidth: 480,
        ipv6AddressId: alicloud.vpc.getIpv6AddressesOutput({
          associatedInstanceId: this.ecs.id,
          vpcId: this.vpc.id,
        }).ids[0],
        ipv6GatewayId: this.ipv6Gateway.id,
        internetChargeType: "PayByTraffic",
      },
      { parent: this }
    );
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }

  get ipv6Address(): pulumi.Output<string> {
    return this.ecs.ipv6Addresses[0];
  }
}
