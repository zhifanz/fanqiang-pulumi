import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class VpcSubnets extends pulumi.ComponentResource {
  readonly securityGroup: aws.ec2.SecurityGroup;
  readonly subnets: pulumi.Output<aws.ec2.Subnet[]>;
  constructor(
    name: string,
    subnetCount: number,
    port: number,
    vpcArgs: aws.ec2.VpcArgs = {},
    parent?: pulumi.Resource
  ) {
    super("fanqiang:aws:Subnet", name, undefined, { parent });

    const vpc = new aws.ec2.Vpc(
      name,
      {
        ...vpcArgs,
        cidrBlock: "192.168.0.0/16",
      },
      { parent: this }
    );
    this.subnets = aws
      .getAvailabilityZonesOutput({ state: "available" })
      .names.apply((names) =>
        (names.length <= subnetCount ? names : names.slice(0, subnetCount)).map(
          (z, i) =>
            new aws.ec2.Subnet(
              `${name}-${i}`,
              {
                vpcId: vpc.id,
                availabilityZone: z,
                cidrBlock: `192.168.${i}.0/24`,
              },
              { parent: this }
            )
        )
      );

    this.securityGroup = new aws.ec2.SecurityGroup(
      name,
      {
        vpcId: vpc.id,
        egress: [
          {
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "all",
          },
        ],
        ingress: [
          {
            fromPort: port,
            toPort: port,
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
          },
        ],
      },
      { parent: this }
    );
    const internetGateway = new aws.ec2.InternetGateway(
      name,
      {
        vpcId: vpc.id,
      },
      { parent: this }
    );
    const routeTable = new aws.ec2.RouteTable(
      name,
      {
        vpcId: vpc.id,
        routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: internetGateway.id }],
      },
      { parent: this }
    );
    this.subnets.apply((all) =>
      all.forEach(
        (subnet, index) =>
          new aws.ec2.RouteTableAssociation(
            `${name}-${index}`,
            {
              routeTableId: routeTable.id,
              subnetId: subnet.id,
            },
            { parent: this }
          )
      )
    );
  }
}
