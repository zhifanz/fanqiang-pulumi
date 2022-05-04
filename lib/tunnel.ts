import * as domain from "./domain";
import { defaultResource } from "./utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import _ from "lodash";

type Proxy = domain.Input<
  Pick<domain.ShadowsocksServerConfiguration, "host" | "port">
>;

export async function apply(
  proxy: Proxy,
  tunnelConfig: domain.TunnelConfiguration
): Promise<{ publicIpAddress: pulumi.Output<string> }> {
  const vpc = defaultResource(alicloud.vpc.Network, {
    cidrBlock: "192.168.0.0/16",
  });

  const securityGroup: alicloud.ecs.SecurityGroup = defaultResource(
    alicloud.ecs.SecurityGroup,
    {
      vpcId: vpc.id,
    }
  );
  createIngressRule("default", proxy.port, securityGroup);
  if (tunnelConfig.publicKey) {
    createIngressRule("ssh", 22, securityGroup);
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
    userData: cloudInitScript(elasticIp, proxy).apply((data) =>
      Buffer.from(data).toString("base64")
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
    launchTemplateConfigs: createlaunchTemplateConfigs(
      vpc.id,
      tunnelConfig.maxPrice
    ),
  });
  return { publicIpAddress: elasticIp.ipAddress };
}

async function createlaunchTemplateConfigs(
  vpcId: pulumi.Input<string>,
  maxPrice: string
) {
  const formater = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
  });
  return (await alicloud.getZones()).ids.map((zoneId, index) => ({
    maxPrice,
    vswitchId: new alicloud.vpc.Switch("default-" + formater.format(index), {
      cidrBlock: `192.168.${index}.0/24`,
      vpcId,
      zoneId,
    }).id,
    weightedCapacity: "1",
  }));
}

function createIngressRule(
  name: string,
  port: pulumi.Input<number>,
  sg: alicloud.ecs.SecurityGroup
) {
  new alicloud.ecs.SecurityGroupRule(name, {
    securityGroupId: sg.id,
    ipProtocol: "tcp",
    type: "ingress",
    cidrIp: "0.0.0.0/0",
    portRange: pulumi.concat(port, "/", port),
  });
}

function cloudInitScript(
  eip: alicloud.ecs.EipAddress,
  proxy: Proxy
): pulumi.Output<string> {
  return pulumi.interpolate`
#!/bin/bash

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
