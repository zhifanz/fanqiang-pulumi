import { DEFAULT_RESOURCE_NAME } from "../utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import _ from "lodash";
export class CloudServer {
  private readonly securityGroup: alicloud.ecs.SecurityGroup;
  private readonly eip: alicloud.ecs.EipAddress;
  constructor(
    cloudInitScript?: pulumi.Input<string>,
    publicKey?: string,
    dependsOn?: pulumi.ResourceOptions["dependsOn"]
  ) {
    const vpc = new alicloud.vpc.Network(DEFAULT_RESOURCE_NAME, {
      cidrBlock: "192.168.0.0/16",
    });
    const vSwitch = new alicloud.vpc.Switch(DEFAULT_RESOURCE_NAME, {
      zoneId: determineZoneId(),
      vpcId: vpc.id,
      cidrBlock: "192.168.0.0/24",
    });

    this.securityGroup = new alicloud.ecs.SecurityGroup(DEFAULT_RESOURCE_NAME, {
      vpcId: vpc.id,
    });
    if (publicKey) {
      this.openPort("ssh", 22);
    }
    this.eip = new alicloud.ecs.EipAddress(DEFAULT_RESOURCE_NAME, {
      bandwidth: "100",
      internetChargeType: "PayByTraffic",
    });
    const ramRole = new alicloud.ram.Role(DEFAULT_RESOURCE_NAME, {
      document: JSON.stringify({
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: ["ecs.aliyuncs.com"],
            },
          },
        ],
        Version: "1",
      }),
    });
    new alicloud.ram.RolePolicyAttachment(DEFAULT_RESOURCE_NAME, {
      policyName: "AliyunEIPFullAccess",
      policyType: "System",
      roleName: ramRole.id,
    });
    new alicloud.ecs.Instance(
      DEFAULT_RESOURCE_NAME,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [this.securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: vSwitch.id,
        keyName:
          publicKey &&
          new alicloud.ecs.EcsKeyPair(DEFAULT_RESOURCE_NAME, {
            publicKey: publicKey,
          }).keyPairName,
        roleName: ramRole.id,
        spotStrategy: "SpotAsPriceGo",
        systemDiskCategory: "cloud_efficiency",
        systemDiskSize: 40,
        userData: toBase64(this.cloudInitScript(cloudInitScript)),
      },
      { dependsOn }
    );
  }

  private cloudInitScript(
    customScript: pulumi.Input<string> = ""
  ): pulumi.Output<string> {
    return pulumi.interpolate`#!/bin/bash

REGION="$(curl --silent http://100.100.100.200/latest/meta-data/region-id)"
aliyun configure set --region $REGION --mode EcsRamRole \
  --ram-role-name "$(curl --silent http://100.100.100.200/latest/meta-data/ram/security-credentials/)"
aliyun --endpoint "vpc-vpc.$REGION.aliyuncs.com" vpc AssociateEipAddress \
  --AllocationId ${this.eip.id} \
  --InstanceId "$(curl --silent http://100.100.100.200/latest/meta-data/instance-id)"

until ping -c1 aliyun.com &>/dev/null ; do sleep 1 ; done
${customScript}
`;
  }

  get publicIpAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }

  openPort(name: string, port: pulumi.Input<number>): void {
    new alicloud.ecs.SecurityGroupRule(name, {
      securityGroupId: this.securityGroup.id,
      ipProtocol: "tcp",
      type: "ingress",
      cidrIp: "0.0.0.0/0",
      portRange: pulumi.concat(port, "/", port),
    });
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

function toBase64(content: pulumi.Output<string>) {
  return content.apply((e) => Buffer.from(e).toString("base64"));
}
