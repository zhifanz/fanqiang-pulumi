import { DEFAULT_RESOURCE_NAME } from "../utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import * as _ from "lodash";
import { Host } from "../../domain/Configuration";
export class CloudServer extends pulumi.ComponentResource implements Host {
  private readonly securityGroup: alicloud.ecs.SecurityGroup;
  private readonly eip: alicloud.ecs.EipAddress;
  constructor(
    ports: Record<string, number>,
    opts?: {
      userData?: string;
      parent?: pulumi.Resource;
    }
  ) {
    super(
      "fanqiang:alicloud:CloudInstance",
      DEFAULT_RESOURCE_NAME,
      undefined,
      opts?.parent && { parent: opts.parent }
    );
    const vpc = new alicloud.vpc.Network(
      DEFAULT_RESOURCE_NAME,
      {
        cidrBlock: "192.168.0.0/16",
      },
      { parent: this }
    );
    const vSwitch = new alicloud.vpc.Switch(
      DEFAULT_RESOURCE_NAME,
      {
        zoneId: determineZoneId(),
        vpcId: vpc.id,
        cidrBlock: "192.168.0.0/24",
      },
      { parent: this }
    );

    this.securityGroup = new alicloud.ecs.SecurityGroup(
      DEFAULT_RESOURCE_NAME,
      {
        vpcId: vpc.id,
      },
      { parent: this }
    );
    for (const k in ports) {
      this.openPort(k, ports[k]);
    }
    this.eip = new alicloud.ecs.EipAddress(
      DEFAULT_RESOURCE_NAME,
      {
        bandwidth: "100",
        internetChargeType: "PayByTraffic",
      },
      { parent: this }
    );
    const instance = new alicloud.ecs.Instance(
      DEFAULT_RESOURCE_NAME,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [this.securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: vSwitch.id,
        spotStrategy: "SpotAsPriceGo",
        systemDiskCategory: "cloud_efficiency",
        systemDiskSize: 40,
        userData:
          opts?.userData && Buffer.from(opts.userData).toString("base64"),
      },
      { parent: this }
    );
    new alicloud.ecs.EipAssociation(
      DEFAULT_RESOURCE_NAME,
      { allocationId: this.eip.id, instanceId: instance.id },
      { parent: this }
    );
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }

  private openPort(
    name: string,
    port: pulumi.Input<number>
  ): alicloud.ecs.SecurityGroupRule {
    return new alicloud.ecs.SecurityGroupRule(
      name,
      {
        securityGroupId: this.securityGroup.id,
        ipProtocol: "tcp",
        type: "ingress",
        cidrIp: "0.0.0.0/0",
        portRange: pulumi.concat(port, "/", port),
      },
      { parent: this }
    );
  }
}

function determineZoneId(): pulumi.Output<string> {
  return alicloud.getZonesOutput({
    availableDiskCategory: "cloud_efficiency",
    availableInstanceType: "ecs.t5-lc2m1.nano",
    instanceChargeType: "PostPaid",
    spotStrategy: "SpotAsPriceGo",
  }).ids[0];
}
