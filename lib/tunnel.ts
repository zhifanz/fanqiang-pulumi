import * as domain from "./domain";
import { DEFAULT_RESOURCE_NAME, PULUMI_PROJECT_NAME } from "./utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import _ from "lodash";

type Proxy = domain.Input<
  Pick<domain.ShadowsocksServerConfiguration, "host" | "port">
>;

export class AlicloudEcsNginxTunnel extends pulumi.ComponentResource {
  readonly publicIpAddress: pulumi.Output<string>;
  constructor(
    name: string,
    proxy: Proxy,
    tunnelConfig: domain.TunnelConfiguration,
    publicKey?: string
  ) {
    super(`${PULUMI_PROJECT_NAME}:tunnel:AlicloudEcsNginxTunnel`, name);
    const vpc = new alicloud.vpc.Network(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      { cidrBlock: "192.168.0.0/16" },
      { parent: this }
    );
    const switches = fromAllZones(
      (zoneId, index) =>
        new alicloud.vpc.Switch(
          `${name}-${zoneId}`,
          {
            zoneId,
            vpcId: vpc.id,
            cidrBlock: `192.168.${index}.0/24`,
          },
          { parent: this }
        )
    );

    const securityGroup = new alicloud.ecs.SecurityGroup(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      { vpcId: vpc.id },
      { parent: this }
    );
    new alicloud.ecs.SecurityGroupRule(
      `${name}-default`,
      ingressRuleArgs(securityGroup.id, proxy.port),
      { parent: this }
    );
    if (publicKey) {
      new alicloud.ecs.SecurityGroupRule(
        `${name}-ssh`,
        ingressRuleArgs(securityGroup.id, 22),
        { parent: this }
      );
    }
    const elasticIp = new alicloud.ecs.EipAddress(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      { bandwidth: tunnelConfig.bandwidth, internetChargeType: "PayByTraffic" },
      { parent: this }
    );
    const ramRole = new alicloud.ram.Role(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
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
      },
      { parent: this }
    );
    new alicloud.ram.RolePolicyAttachment(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        policyName: "AliyunEIPFullAccess",
        policyType: "System",
        roleName: ramRole.id,
      },
      { parent: this }
    );
    const launchTemplate = new alicloud.ecs.LaunchTemplate(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        launchTemplateName: "FanqiangTunnelTemplate",
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceChargeType: "PostPaid",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroupId: securityGroup.id,
        spotDuration: "0",
        spotStrategy: "SpotAsPriceGo",
        ramRoleName: ramRole.id,
        keyPairName:
          publicKey &&
          new alicloud.ecs.EcsKeyPair(
            DEFAULT_RESOURCE_NAME,
            { publicKey },
            { parent: this }
          ).keyPairName,
        userData: cloudInitScript(elasticIp, proxy).apply((data) =>
          Buffer.from(data).toString("base64")
        ),
        systemDisk: {
          category: "cloud_efficiency",
          deleteWithInstance: true,
          size: 40,
        },
      },
      { parent: this }
    );
    new alicloud.ecs.AutoProvisioningGroup(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        launchTemplateId: launchTemplate.id,
        totalTargetCapacity: "1",
        payAsYouGoTargetCapacity: "0",
        spotTargetCapacity: "1",
        autoProvisioningGroupType: "maintain",
        spotAllocationStrategy: "lowest-price",
        spotInstanceInterruptionBehavior: "terminate",
        excessCapacityTerminationPolicy: "termination",
        terminateInstances: true,
        launchTemplateConfigs: switches.apply((e) =>
          e.map((s) => ({
            maxPrice: tunnelConfig.maxPrice,
            vswitchId: s.id,
            weightedCapacity: "1",
          }))
        ),
      },
      { parent: this }
    );
    this.publicIpAddress = elasticIp.ipAddress;
    this.registerOutputs();
  }
}

function fromAllZones<T extends pulumi.CustomResource>(
  callback: (zoneId: string, index: number) => T
): pulumi.Output<T[]> {
  return alicloud.getZonesOutput().ids.apply((ids) => ids.map(callback));
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

function cloudInitScript(
  eip: alicloud.ecs.EipAddress,
  proxy: Proxy
): pulumi.Output<string> {
  return pulumi.interpolate`#!/bin/bash

REGION="$(curl --silent http://100.100.100.200/latest/meta-data/region-id)"
aliyun configure set --region $REGION --mode EcsRamRole \
  --ram-role-name "$(curl --silent http://100.100.100.200/latest/meta-data/ram/security-credentials/)"
aliyun --endpoint "vpc-vpc.$REGION.aliyuncs.com" vpc AssociateEipAddress \
  --AllocationId ${eip.id} \
  --InstanceId "$(curl --silent http://100.100.100.200/latest/meta-data/instance-id)"

until ping -c1 aliyun.com &>/dev/null ; do sleep 1 ; done
yum install -y nginx nginx-all-modules
cat > /etc/nginx/nginx.conf <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
include /usr/share/nginx/modules/*.conf;
events {
  worker_connections 1024;
}
stream {
  server {
    listen ${proxy.port};
    proxy_pass ${proxy.host}:${proxy.port};
  }
}
EOF
systemctl start nginx
`;
}
