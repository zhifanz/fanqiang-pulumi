import * as domain from "../../domain";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import _ from "lodash";

export type Proxy = domain.Input<
  Pick<domain.ShadowsocksServerConfiguration, "host" | "port">
>;

export type TunnelConfiguration = {
  bandwidth: string;
  maxPrice: string;
};

export abstract class AlicloudEcsTunnelConstructor {
  abstract readonly port: pulumi.Input<number>;
  abstract readonly bandwidth: pulumi.Input<string>;
  abstract readonly maxPrice: pulumi.Input<string>;
  abstract readonly publicKey?: pulumi.Input<string>;
  apply(): { publicIpAddress: pulumi.Output<string> } {
    const vpc = new alicloud.vpc.Network(DEFAULT_RESOURCE_NAME, {
      cidrBlock: "192.168.0.0/16",
    });
    const vSwitch = new alicloud.vpc.Switch(DEFAULT_RESOURCE_NAME, {
      zoneId: determineZoneId(),
      vpcId: vpc.id,
      cidrBlock: `192.168.0.0/24`,
    });

    const securityGroup = new alicloud.ecs.SecurityGroup(
      DEFAULT_RESOURCE_NAME,
      { vpcId: vpc.id }
    );
    new alicloud.ecs.SecurityGroupRule(
      "default",
      ingressRuleArgs(securityGroup.id, this.port)
    );
    if (this.publicKey) {
      new alicloud.ecs.SecurityGroupRule(
        "ssh",
        ingressRuleArgs(securityGroup.id, 22)
      );
    }
    const elasticIp = new alicloud.ecs.EipAddress(DEFAULT_RESOURCE_NAME, {
      bandwidth: this.bandwidth,
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
    new alicloud.ecs.Instance(DEFAULT_RESOURCE_NAME, {
      imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
      instanceType: "ecs.t5-lc2m1.nano",
      securityGroups: [securityGroup.id],
      instanceChargeType: "PostPaid",
      vswitchId: vSwitch.id,
      keyName:
        this.publicKey &&
        new alicloud.ecs.EcsKeyPair(DEFAULT_RESOURCE_NAME, {
          publicKey: this.publicKey,
        }).keyPairName,
      roleName: ramRole.id,
      spotStrategy: "SpotAsPriceGo",
      systemDiskCategory: "cloud_efficiency",
      systemDiskSize: 40,
      userData: this.cloudInitScript(elasticIp).apply((data) =>
        Buffer.from(data).toString("base64")
      ),
    });
    return { publicIpAddress: elasticIp.ipAddress };
  }

  protected cloudInitScript(
    eip: alicloud.ecs.EipAddress
  ): pulumi.Output<string> {
    return pulumi.interpolate`#!/bin/bash

REGION="$(curl --silent http://100.100.100.200/latest/meta-data/region-id)"
aliyun configure set --region $REGION --mode EcsRamRole \
  --ram-role-name "$(curl --silent http://100.100.100.200/latest/meta-data/ram/security-credentials/)"
aliyun --endpoint "vpc-vpc.$REGION.aliyuncs.com" vpc AssociateEipAddress \
  --AllocationId ${eip.id} \
  --InstanceId "$(curl --silent http://100.100.100.200/latest/meta-data/instance-id)"

until ping -c1 aliyun.com &>/dev/null ; do sleep 1 ; done
`;
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

function ingressRuleArgs(
  securityGroupId: pulumi.Input<string>,
  port: pulumi.Input<number>
) {
  return {
    securityGroupId,
    ipProtocol: "tcp",
    type: "ingress",
    cidrIp: "0.0.0.0/0",
    portRange: pulumi.concat(port, "/", port),
  };
}
