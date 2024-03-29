import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Host } from "../domain";
import { getRegion } from "../aws/utils";

export type ContainerInputs = {
  name: string;
  image: string;
  port: number;
  command: string[];
};

const TaskSize = { cpu: 256, memory: 512 } as const;

export class AwsEcsFargate extends pulumi.ComponentResource implements Host {
  private readonly vpc: Vpc;
  private readonly service: aws.ecs.Service;
  constructor(
    containerInputs: ContainerInputs,
    logGroup?: aws.cloudwatch.LogGroup
  ) {
    super("fanqiang:aws:AwsEcsFargate", containerInputs.name);
    this.vpc = new Vpc(containerInputs.name, containerInputs.port, this);
    const cluster = new aws.ecs.Cluster(containerInputs.name, undefined, {
      parent: this,
    });
    new aws.ecs.ClusterCapacityProviders(
      containerInputs.name,
      {
        clusterName: cluster.name,
        capacityProviders: ["FARGATE"],
        defaultCapacityProviderStrategies: [
          { capacityProvider: "FARGATE", base: 1, weight: 1 },
        ],
      },
      { parent: this }
    );

    const task = new aws.ecs.TaskDefinition(
      containerInputs.name,
      {
        containerDefinitions: pulumi
          .all([getRegion(), logGroup?.name])
          .apply(([region, logGroup]) =>
            JSON.stringify([container(containerInputs, region, logGroup)])
          ),
        executionRoleArn: this.executionRole(containerInputs.name).arn,
        family: containerInputs.name,
        networkMode: "awsvpc",
        cpu: TaskSize.cpu.toString(),
        memory: TaskSize.memory.toString(),
        requiresCompatibilities: ["FARGATE"],
        runtimePlatform: {
          operatingSystemFamily: "LINUX",
          cpuArchitecture: "X86_64",
        },
      },
      { parent: this }
    );
    this.service = new aws.ecs.Service(
      containerInputs.name,
      {
        cluster: cluster.arn,
        taskDefinition: task.arn,
        name: containerInputs.name,
        networkConfiguration: {
          subnets: [this.vpc.subnet.id],
          securityGroups: [this.vpc.securityGroup.id],
          assignPublicIp: true,
        },
        launchType: "FARGATE",
        desiredCount: 1,
        waitForSteadyState: true,
      },
      { parent: this }
    );
  }

  private executionRole(name: string) {
    const assumeRolePolicy = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          actions: ["sts:AssumeRole"],
          principals: [
            {
              type: "Service",
              identifiers: ["ecs-tasks.amazonaws.com"],
            },
          ],
        },
      ],
    });
    return new aws.iam.Role(
      `${name}-fargate-execution-role`,
      {
        assumeRolePolicy: assumeRolePolicy.json,
        forceDetachPolicies: true,
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        ],
      },
      { parent: this }
    );
  }

  get ipAddress(): pulumi.Output<string> {
    return this.service.id.apply(
      () => this.getNetworkInterface().associations[0].publicIp
    );
  }

  get ipv6Address(): pulumi.Output<string> {
    return this.service.id.apply(
      () => this.getNetworkInterface().ipv6Addresses[0]
    );
  }

  private getNetworkInterface() {
    return aws.ec2.getNetworkInterfaceOutput(
      {
        filters: [{ name: "vpc-id", values: [this.vpc.vpc.id] }],
      },
      { parent: this }
    );
  }
}

function container(inputs: ContainerInputs, region: string, logGroup?: string) {
  const result: any = {
    command: inputs.command,
    cpu: TaskSize.cpu,
    environment: [],
    essential: true,
    image: inputs.image,
    memory: TaskSize.memory,
    mountPoints: [],
    name: inputs.name,
    portMappings: [
      { containerPort: inputs.port, hostPort: inputs.port, protocol: "tcp" },
    ],
    volumesFrom: [],
  };
  if (logGroup) {
    result.logConfiguration = {
      logDriver: "awslogs",
      options: {
        "awslogs-group": logGroup,
        "awslogs-region": region,
        "awslogs-stream-prefix": "ssserver",
        mode: "non-blocking",
      },
    };
  }
  return result;
}

class Vpc {
  readonly vpc: aws.ec2.Vpc;
  readonly subnet: aws.ec2.Subnet;
  readonly securityGroup: aws.ec2.SecurityGroup;
  constructor(name: string, port: number, parent: pulumi.Resource) {
    this.vpc = new aws.ec2.Vpc(
      `${name}-fargate-vpc`,
      {
        assignGeneratedIpv6CidrBlock: true,
        cidrBlock: "192.168.0.0/16",
      },
      { parent }
    );
    this.subnet = new aws.ec2.Subnet(
      `${name}-fargate-subnet`,
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
      `${name}-fargate-security-group`,
      {
        vpcId: this.vpc.id,
        description: "For ecs fragate cluster",
        ingress: [
          {
            protocol: "tcp",
            fromPort: port,
            toPort: port,
            cidrBlocks: ["0.0.0.0/0"],
            ipv6CidrBlocks: ["::/0"],
          },
        ],
        egress: [
          {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
            ipv6CidrBlocks: ["::/0"],
          },
        ],
      },
      { parent }
    );
    const gateway = new aws.ec2.InternetGateway(
      `${name}-fargate-gateway`,
      {
        vpcId: this.vpc.id,
      },
      { parent }
    );
    new aws.ec2.Route(
      `${name}-fargate-route`,
      {
        routeTableId: this.vpc.mainRouteTableId,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: gateway.id,
      },
      { parent }
    );
    new aws.ec2.Route(
      `${name}-fargate-route-ipv6`,
      {
        routeTableId: this.vpc.mainRouteTableId,
        destinationIpv6CidrBlock: "::/0",
        gatewayId: gateway.id,
      },
      { parent }
    );
  }
}
