import * as domain from "./domain";
import * as common from "./common";
import * as proxy from "./proxy";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { readFile } from "fs/promises";
import _ = require("lodash");

export async function apply(
  shadowsocksConfig: pulumi.Input<
    Pick<domain.ShadowsocksServerConfiguration, "host" | "port">
  >,
  tunnelConfig: domain.TunnelConfiguration
): Promise<{ publicIpAddress: pulumi.Output<string> }> {
  const templateFunc = await loadCloudInitTemplate();
  const shadowsocksConfigOutput = pulumi.output(shadowsocksConfig);
  const zoneCandidates = await alicloud.getZones();

  const vpc = new alicloud.vpc.Network("default", {
    cidrBlock: "192.168.0.0/16",
  });

  const switches = zoneCandidates.ids.map(
    (zoneId, index) =>
      new alicloud.vpc.Switch(`default-${index}`, {
        cidrBlock: `192.168.${index}.0/24`,
        vpcId: vpc.id,
        zoneId,
      })
  );
  const securityGroup = new alicloud.ecs.SecurityGroup("default", {
    vpcId: vpc.id,
  });
  new alicloud.ecs.SecurityGroupRule("default", {
    securityGroupId: securityGroup.id,
    ipProtocol: "tcp",
    type: "ingress",
    cidrIp: "0.0.0.0/0",
    portRange: shadowsocksConfigOutput.apply((e) => `${e.port}/${e.port}`),
  });
  if (tunnelConfig.publicKey) {
    new alicloud.ecs.SecurityGroupRule("ssh", {
      securityGroupId: securityGroup.id,
      ipProtocol: "tcp",
      type: "ingress",
      cidrIp: "0.0.0.0/0",
      portRange: "22/22",
    });
  }
  const elasticIp = new alicloud.ecs.EipAddress("default", {
    bandwidth: tunnelConfig.bandwidth,
    internetChargeType: "PayByTraffic",
  });
  const ramRole = new alicloud.ram.Role("default", {
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
  new alicloud.ram.RolePolicyAttachment("default", {
    policyName: "AliyunEIPFullAccess",
    policyType: "System",
    roleName: ramRole.id,
  });
  const launchTemplate = new alicloud.ecs.LaunchTemplate("default", {
    launchTemplateName: "FanqiangTunnelTemplate",
    imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
    instanceChargeType: "PostPaid",
    instanceType: "ecs.t5-lc2m1.nano",
    securityGroupId: securityGroup.id,
    spotDuration: "0",
    spotStrategy: "SpotAsPriceGo",
    ramRoleName: ramRole.id,
    keyPairName: tunnelConfig.publicKey
      ? new alicloud.ecs.EcsKeyPair("default", {
          publicKey: tunnelConfig.publicKey,
        }).id
      : undefined,
    userData: pulumi
      .all([shadowsocksConfigOutput, elasticIp.id])
      .apply(([config, allocationId]) =>
        Buffer.from(
          templateFunc({
            allocationId,
            proxyIp: config.host,
            port: config.port,
          })
        ).toString("base64")
      ),
    systemDisk: {
      category: "cloud_efficiency",
      deleteWithInstance: true,
      size: 40,
    },
  });
  new alicloud.ecs.AutoProvisioningGroup("default", {
    launchTemplateId: launchTemplate.id,
    totalTargetCapacity: "1",
    payAsYouGoTargetCapacity: "0",
    spotTargetCapacity: "1",
    autoProvisioningGroupType: "maintain",
    spotAllocationStrategy: "lowest-price",
    spotInstanceInterruptionBehavior: "terminate",
    excessCapacityTerminationPolicy: "termination",
    terminateInstances: true,
    launchTemplateConfigs: switches.map((s) => ({
      maxPrice: tunnelConfig.maxPrice,
      vswitchId: s.id,
      weightedCapacity: "1",
    })),
  });
  return { publicIpAddress: elasticIp.ipAddress };
}

export async function loadCloudInitTemplate(): Promise<_.TemplateExecutor> {
  return _.template(
    await readFile(__dirname + "/tunnel-cloud-init.tpl", "utf8")
  );
}
