import { DEFAULT_RESOURCE_NAME } from "../utils";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import _ from "lodash";
import { Host } from "../../domain/Host";
import {
  InstanceProvision,
  ProvisionInstanceFunction,
} from "../InstanceProvision";
export class CloudServer extends pulumi.ComponentResource implements Host {
  private readonly securityGroup: alicloud.ecs.SecurityGroup;
  private readonly eip: alicloud.ecs.EipAddress;
  constructor(
    ports: Record<string, number>,
    opts?: {
      provisionInstance?: ProvisionInstanceFunction;
      dependsOn?: pulumi.ResourceOptions["dependsOn"];
      parent?: pulumi.Resource;
    }
  ) {
    super("CloudServer", DEFAULT_RESOURCE_NAME, undefined, {
      parent: opts?.parent,
    });
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
    const ramRole = new alicloud.ram.Role(
      DEFAULT_RESOURCE_NAME,
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
      DEFAULT_RESOURCE_NAME,
      {
        policyName: "AliyunEIPFullAccess",
        policyType: "System",
        roleName: ramRole.id,
      },
      { parent: this }
    );
    new alicloud.ecs.Instance(
      DEFAULT_RESOURCE_NAME,
      {
        imageId: "aliyun_2_1903_x64_20G_alibase_20210726.vhd",
        instanceType: "ecs.t5-lc2m1.nano",
        securityGroups: [this.securityGroup.id],
        instanceChargeType: "PostPaid",
        vswitchId: vSwitch.id,
        roleName: ramRole.id,
        spotStrategy: "SpotAsPriceGo",
        systemDiskCategory: "cloud_efficiency",
        systemDiskSize: 40,
        userData:
          opts?.provisionInstance &&
          this.generateUserData(opts.provisionInstance),
      },
      { dependsOn: opts?.dependsOn, parent: this }
    );
  }

  private generateUserData(
    provisionInstance: ProvisionInstanceFunction
  ): pulumi.Output<string> {
    const instanceProvision = new InstanceProvision(true);
    instanceProvision.addCommand(scripts.bindEip(this.eip.id), true);
    provisionInstance(instanceProvision);
    return pulumi
      .output(instanceProvision.toShellScript())
      .apply((e) => Buffer.from(e).toString("base64"));
  }

  get ipAddress(): pulumi.Output<string> {
    return this.eip.ipAddress;
  }

  private openPort(name: string, port: pulumi.Input<number>): void {
    new alicloud.ecs.SecurityGroupRule(
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

const scripts = {
  bindEip: (eip: pulumi.Input<string>) => pulumi.interpolate`
REGION="$(curl --silent http://100.100.100.200/latest/meta-data/region-id)"
aliyun configure set --region $REGION --mode EcsRamRole \
  --ram-role-name "$(curl --silent http://100.100.100.200/latest/meta-data/ram/security-credentials/)"
aliyun --endpoint "vpc-vpc.$REGION.aliyuncs.com" vpc AssociateEipAddress \
  --AllocationId ${eip} \
  --InstanceId "$(curl --silent http://100.100.100.200/latest/meta-data/instance-id)"
`,
} as const;

function determineZoneId(): pulumi.Output<string> {
  return alicloud.getZonesOutput({
    availableDiskCategory: "cloud_efficiency",
    availableInstanceType: "ecs.t5-lc2m1.nano",
    instanceChargeType: "PostPaid",
    spotStrategy: "SpotAsPriceGo",
  }).ids[0];
}
