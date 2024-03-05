import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";

export abstract class AlicloudTunnelServiceSupport extends pulumi.ComponentResource {
  protected readonly vpc: alicloud.vpc.Network;
  protected readonly vSwitch: alicloud.vpc.Switch;
  protected readonly eip: alicloud.ecs.EipAddress;
  protected readonly ipv6Gateway: alicloud.vpc.Ipv6Gateway;
  protected readonly securityGroup: alicloud.ecs.SecurityGroup;
  constructor(type: string, name: string, readonly port: number) {
    super(type, name);
    this.eip = this.elasticIpAddress(name);
    this.vpc = new alicloud.vpc.Network(
      name,
      { cidrBlock: "192.168.0.0/16", enableIpv6: true },
      { parent: this }
    );
    this.vSwitch = new alicloud.vpc.Switch(
      name,
      {
        zoneId: availableZones().ids[0],
        vpcId: this.vpc.id,
        cidrBlock: `192.168.0.0/24`,
        enableIpv6: true,
        ipv6CidrBlockMask: 1,
      },
      { parent: this }
    );
    this.ipv6Gateway = new alicloud.vpc.Ipv6Gateway(
      name,
      { vpcId: this.vpc.id },
      { parent: this }
    );
    this.securityGroup = new alicloud.ecs.SecurityGroup(
      name,
      {
        vpcId: this.vpc.id,
      },
      { parent: this }
    );
    new alicloud.ecs.SecurityGroupRule(
      `${name}-ipv4`,
      {
        securityGroupId: this.securityGroup.id,
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
        securityGroupId: this.securityGroup.id,
        ipProtocol: "tcp",
        type: "ingress",
        ipv6CidrIp: "::/0",
        portRange: `${port}/${port}`,
      },
      { parent: this }
    );
  }

  protected configIpv6InternetBandwidth(
    name: string,
    ipv6Resource: pulumi.Resource,
    associatedInstanceId?: pulumi.Input<string>
  ) {
    new alicloud.vpc.Ipv6InternetBandwidth(
      name,
      {
        bandwidth: 480,
        ipv6AddressId: alicloud.vpc.getIpv6AddressesOutput({
          associatedInstanceId,
          vpcId: this.vpc.id,
        }).ids[0],
        ipv6GatewayId: this.ipv6Gateway.id,
        internetChargeType: "PayByTraffic",
      },
      { parent: this, dependsOn: [ipv6Resource] }
    );
  }

  private elasticIpAddress(name: string): alicloud.ecs.EipAddress {
    const eip = new alicloud.ecs.EipAddress(
      name,
      { paymentType: "PayAsYouGo" },
      { parent: this }
    );
    const bandwidth = new alicloud.vpc.CommonBandwithPackage(
      name,
      {
        bandwidth: "1000",
        bandwidthPackageName: "overseatraffic",
        description: "Bandwidth for all oversea traffic",
        internetChargeType: "PayByDominantTraffic",
      },
      { parent: this }
    );
    new alicloud.vpc.CommonBandwithPackageAttachment(
      name,
      { bandwidthPackageId: bandwidth.id, instanceId: eip.id },
      { parent: this }
    );
    return eip;
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }
}

export function availableZones(): pulumi.Output<alicloud.GetZonesResult> {
  return alicloud.getZonesOutput({
    instanceChargeType: "PostPaid",
    availableDiskCategory: "cloud_efficiency",
    availableInstanceType: "ecs.t5-lc2m1.nano",
    spotStrategy: "SpotAsPriceGo",
  });
}

export function base64Encode(data: pulumi.Input<string>) {
  return pulumi
    .output(data)
    .apply((script) => Buffer.from(script).toString("base64"));
}

export async function currentRegion() {
  return (await alicloud.getRegions({ current: true })).regions[0].id;
}
