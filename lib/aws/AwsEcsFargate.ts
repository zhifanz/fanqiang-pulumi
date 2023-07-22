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

export class AwsEcsFargate extends pulumi.ComponentResource implements Host {
  private readonly vpc: Vpc;
  private readonly service: aws.ecs.Service;
  constructor(
    containerInputs: ContainerInputs,
    opts?: { logGroup?: aws.cloudwatch.LogGroup; provider?: aws.Provider }
  ) {
    super("fanqiang:aws:AwsEcsFargate", containerInputs.name, undefined, {
      providers: opts?.provider && { aws: opts?.provider },
    });
    this.vpc = new Vpc(containerInputs.name, containerInputs.port, this);
    const cluster = new aws.ecs.Cluster(containerInputs.name, undefined, {
      parent: this,
    });
    new aws.ecs.ClusterCapacityProviders(
      containerInputs.name,
      {
        clusterName: cluster.name,
        capacityProviders: ["FARGATE_SPOT"],
        defaultCapacityProviderStrategies: [
          { capacityProvider: "FARGATE_SPOT", base: 1, weight: 1 },
        ],
      },
      { parent: this }
    );

    const task = new aws.ecs.TaskDefinition(
      containerInputs.name,
      {
        containerDefinitions: pulumi
          .all([getRegion(), opts?.logGroup?.name])
          .apply(([region, logGroup]) =>
            JSON.stringify([container(containerInputs, region, logGroup)])
          ),
        executionRoleArn: this.executionRole(containerInputs.name).arn,
        family: containerInputs.name,
        networkMode: "awsvpc",
        cpu: "256",
        memory: "512",
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
      () =>
        aws.ec2.getNetworkInterfaceOutput(
          {
            filters: [{ name: "vpc-id", values: [this.vpc.vpc.id] }],
          },
          { parent: this }
        ).associations[0].publicIp
    );
  }
}

function container(inputs: ContainerInputs, region: string, logGroup?: string) {
  const result: any = {
    name: inputs.name,
    image: inputs.image,
    portMappings: [{ containerPort: inputs.port, hostPort: inputs.port }],
    essential: true,
    command: inputs.command,
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
        cidrBlock: "192.168.0.0/16",
      },
      { parent }
    );
    this.subnet = new aws.ec2.Subnet(
      `${name}-fargate-subnet`,
      {
        vpcId: this.vpc.id,
        cidrBlock: `192.168.0.0/24`,
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
          },
        ],
        egress: [
          { fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] },
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
  }
}
