import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Host } from "../domain";

export class AwsEc2Instance extends pulumi.ComponentResource implements Host {
  spotRequest: aws.ec2.SpotInstanceRequest;
  eip: aws.ec2.Eip;
  constructor(name: string, ami: pulumi.Input<string>, userData?: string) {
    super("fanqiang:aws:vmservice", name);
    const vpc = new Vpc(name, this);
    this.spotRequest = new aws.ec2.SpotInstanceRequest(
      name,
      {
        ami: ami,
        instanceType: "t3.small",
        creditSpecification: { cpuCredits: "standard" },
        ipv6AddressCount: 1,
        sourceDestCheck: false,
        subnetId: vpc.subnet.id,
        vpcSecurityGroupIds: [vpc.securityGroup.id],
        userData,
        iamInstanceProfile: this.s3AccessProfile(name).name,
        waitForFulfillment: true,
      },
      { parent: this }
    );
    this.eip = new aws.ec2.Eip(
      name,
      {
        instance: this.spotRequest.spotInstanceId,
      },
      { parent: this }
    );
  }

  s3AccessProfile(name: string): aws.iam.InstanceProfile {
    const role = new aws.iam.Role(
      name,
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              effect: "Allow",
              actions: ["sts:AssumeRole"],
              principals: [
                { type: "Service", identifiers: ["ec2.amazonaws.com"] },
              ],
            },
          ],
        }).json,
      },
      { parent: this }
    );
    new aws.iam.RolePolicyAttachment(
      name,
      {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
      },
      { parent: this }
    );
    return new aws.iam.InstanceProfile(
      name,
      { role: role.name },
      { parent: this }
    );
  }

  get ipAddress() {
    return this.eip.publicIp;
  }

  get ipv6Address() {
    return aws.ec2.getInstanceOutput({
      instanceId: this.spotRequest.spotInstanceId,
    }).ipv6Addresses[0];
  }
}

class Vpc {
  readonly vpc: aws.ec2.Vpc;
  readonly subnet: aws.ec2.Subnet;
  readonly securityGroup: aws.ec2.SecurityGroup;
  static readonly allowAllSecurityRule = {
    protocol: "-1",
    fromPort: 0,
    toPort: 0,
    cidrBlocks: ["0.0.0.0/0"],
    ipv6CidrBlocks: ["::/0"],
  };
  constructor(name: string, parent: pulumi.Resource) {
    this.vpc = new aws.ec2.Vpc(
      `${name}-vpc`,
      {
        assignGeneratedIpv6CidrBlock: true,
        cidrBlock: "192.168.0.0/16",
      },
      { parent }
    );
    this.subnet = new aws.ec2.Subnet(
      `${name}-subnet`,
      {
        vpcId: this.vpc.id,
        cidrBlock: `192.168.0.0/24`,
        ipv6CidrBlock: this.vpc.ipv6CidrBlock.apply(
          (ip) => ip.substring(0, ip.indexOf("/")) + "/64"
        ),
        assignIpv6AddressOnCreation: true,
      },
      { parent }
    );
    this.securityGroup = new aws.ec2.SecurityGroup(
      `${name}-security-group`,
      {
        vpcId: this.vpc.id,
        description: `For ${name} vpc`,
        ingress: [Vpc.allowAllSecurityRule],
        egress: [Vpc.allowAllSecurityRule],
      },
      { parent }
    );
    const gateway = new aws.ec2.InternetGateway(
      `${name}-igw`,
      {
        vpcId: this.vpc.id,
      },
      { parent }
    );
    new aws.ec2.Route(
      `${name}-route-ipv4`,
      {
        routeTableId: this.vpc.mainRouteTableId,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: gateway.id,
      },
      { parent }
    );
    new aws.ec2.Route(
      `${name}-route-ipv6`,
      {
        routeTableId: this.vpc.mainRouteTableId,
        destinationIpv6CidrBlock: "::/0",
        gatewayId: gateway.id,
      },
      { parent }
    );
  }
}
