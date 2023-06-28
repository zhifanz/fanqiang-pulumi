import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { Host } from "../domain";

export type ContainerInputs = { image: string; args?: pulumi.Input<string>[] };

export class AlicloudEciContainerGroup
  extends pulumi.ComponentResource
  implements Host
{
  private readonly eip: alicloud.ecs.EipAddress;
  constructor(name: string, port: number, containerInputs: ContainerInputs) {
    super("fanqiang:alicloud:AlicloudEciContainerGroup", name);
    this.eip = this.elasticIpAddress(name);
    const vpc = new alicloud.vpc.Network(
      name,
      { cidrBlock: "192.168.0.0/16" },
      { parent: this }
    );
    const vSwitch = new alicloud.vpc.Switch(
      name,
      {
        zoneId: availableZones().ids[0],
        vpcId: vpc.id,
        cidrBlock: "192.168.0.0/24",
      },
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
      name,
      {
        securityGroupId: securityGroup.id,
        ipProtocol: "tcp",
        type: "ingress",
        cidrIp: "0.0.0.0/0",
        portRange: `${port}/${port}`,
      },
      { parent: this }
    );
    new alicloud.eci.ContainerGroup(
      name,
      {
        containerGroupName: name,
        containers: [
          {
            image: containerInputs.image,
            name: name,
            args: containerInputs.args,
            ports: [{ port: port, protocol: "TCP" }],
          },
        ],
        securityGroupId: securityGroup.id,
        vswitchId: vSwitch.id,
        cpu: 2,
        memory: 1,
        restartPolicy: "Always",
        eipInstanceId: this.eip.id,
      },
      { parent: this }
    );
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
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
