import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { Host } from "../domain";

export class AlicloudEcsInstance
  extends pulumi.ComponentResource
  implements Host
{
  private readonly eip: alicloud.ecs.EipAddress;
  private readonly ecs: alicloud.ecs.Instance;
  constructor(name: string, port: number, userData: pulumi.Input<string>) {
    super("fanqiang:alicloud:AlicloudEciContainerGroup", name);
    this.eip = this.elasticIpAddress(name);
    const vpc = new alicloud.vpc.Network(
      name,
      { cidrBlock: "192.168.0.0/16", enableIpv6: true },
      { parent: this }
    );
    const vSwitch = new alicloud.vpc.Switch(
      name,
      {
        zoneId: availableZones().ids[0],
        vpcId: vpc.id,
        cidrBlock: "192.168.0.0/24",
        enableIpv6: true,
        ipv6CidrBlockMask: 12,
      },
      { parent: this }
    );
    const ipv6Gateway = new alicloud.vpc.Ipv6Gateway(
      name,
      { vpcId: vpc.id },
      { parent: this }
    );
    const securityGroup = new alicloud.ecs.SecurityGroup(
      name,
      {
        vpcId: vpc.id,
      },
      { parent: this }
    );
    new alicloud.ecs.SecurityGroupRule(
      `${name}-ipv4`,
      {
        securityGroupId: securityGroup.id,
        ipProtocol: "tcp",
        type: "ingress",
        cidrIp: "0.0.0.0/0",
        portRange: `${port}/${port}`,
      },
      { parent: this }
    );
    new alicloud.ecs.SecurityGroupRule(
      `${name}-ipv6`,
      {
        securityGroupId: securityGroup.id,
        ipProtocol: "tcp",
        type: "ingress",
        ipv6CidrIp: "::/0",
        portRange: `${port}/${port}`,
      },
      { parent: this }
    );

    this.ecs = new alicloud.ecs.Instance(
      name,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: vSwitch.id,
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
    new alicloud.vpc.Ipv6InternetBandwidth(
      name,
      {
        bandwidth: 480,
        ipv6AddressId: alicloud.vpc.getIpv6AddressesOutput({
          associatedInstanceId: this.ecs.id,
          vpcId: vpc.id,
        }).ids[0],
        ipv6GatewayId: ipv6Gateway.id,
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

  private elasticIpAddress(name: string): alicloud.ecs.EipAddress {
    const eip = new alicloud.ecs.EipAddress(
      name,
      { paymentType: "PayAsYouGo" },
      { parent: this }
    );
    const bandwidth = new alicloud.vpc.CommonBandwithPackage(name, {
      bandwidth: "1000",
      bandwidthPackageName: "overseatraffic",
      description: "Bandwidth for all oversea traffic",
      internetChargeType: "PayByDominantTraffic",
    });
    new alicloud.vpc.CommonBandwithPackageAttachment(
      name,
      { bandwidthPackageId: bandwidth.id, instanceId: eip.id },
      { parent: this }
    );
    return eip;
  }
}

export function availableZones(): pulumi.Output<alicloud.GetZonesResult> {
  return alicloud.getZonesOutput({
    availableDiskCategory: "cloud_efficiency",
    availableInstanceType: "ecs.t5-lc2m1.nano",
    instanceChargeType: "PostPaid",
    spotStrategy: "SpotAsPriceGo",
  });
}
