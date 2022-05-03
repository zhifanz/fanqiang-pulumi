import * as domain from "./domain";
import defaultResource from "./resourceUtils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { readFile } from "fs/promises";
import _ from "lodash";

export async function apply(
  shadowsocksConfig: pulumi.Input<
    Pick<domain.ShadowsocksServerConfiguration, "host" | "port">
  >,
  tunnelConfig: domain.TunnelConfiguration
): Promise<{ publicIpAddress: pulumi.Output<string> }> {
  const templateFunc = await loadCloudInitTemplate();
  const shadowsocksConfigOutput = pulumi.output(shadowsocksConfig);
  const zoneCandidates = await alicloud.getZones();

  const vpc = defaultResource(alicloud.vpc.Network, {
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
  const securityGroup = defaultResource(alicloud.ecs.SecurityGroup, {
    vpcId: vpc.id,
  });
  createIngressRule(
    "default",
    shadowsocksConfigOutput.apply((e) => `${e.port}/${e.port}`),
    securityGroup.id
  );
  if (tunnelConfig.publicKey) {
    createIngressRule("ssh", "22/22", securityGroup.id);
  }
  const elasticIp: alicloud.ecs.EipAddress = defaultResource(
    alicloud.ecs.EipAddress,
    {
      bandwidth: tunnelConfig.bandwidth,
      internetChargeType: "PayByTraffic",
    }
  );
  const ramRole = defaultResource(alicloud.ram.Role, {
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
  defaultResource(alicloud.ram.RolePolicyAttachment, {
    policyName: "AliyunEIPFullAccess",
    policyType: "System",
    roleName: ramRole.id,
  });
  const launchTemplate = defaultResource(alicloud.ecs.LaunchTemplate, {
    launchTemplateName: "FanqiangTunnelTemplate",
    imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
    instanceChargeType: "PostPaid",
    instanceType: "ecs.t5-lc2m1.nano",
    securityGroupId: securityGroup.id,
    spotDuration: "0",
    spotStrategy: "SpotAsPriceGo",
    ramRoleName: ramRole.id,
    keyPairName:
      tunnelConfig.publicKey &&
      new alicloud.ecs.EcsKeyPair("default", {
        publicKey: tunnelConfig.publicKey,
      }).id,
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
  defaultResource(alicloud.ecs.AutoProvisioningGroup, {
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

function createIngressRule(
  name: string,
  portRange: pulumi.Input<string>,
  securityGroupId: pulumi.Input<string>
) {
  new alicloud.ecs.SecurityGroupRule(name, {
    securityGroupId,
    ipProtocol: "tcp",
    type: "ingress",
    cidrIp: "0.0.0.0/0",
    portRange,
  });
}

export async function loadCloudInitTemplate(): Promise<_.TemplateExecutor> {
  return _.template(
    await readFile(__dirname + "/tunnel-cloud-init.tpl", "utf8")
  );
}
