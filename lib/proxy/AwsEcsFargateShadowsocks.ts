import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import { ShadowsocksProperties } from "./shadowsocks";
import { Host } from "../domain";
import { getRegion } from "../aws/utils";

export class AwsEcsFargateShadowsocks
  extends pulumi.ComponentResource
  implements Host
{
  private readonly vpc: Vpc;
  private readonly service: aws.ecs.Service;
  constructor(props: ShadowsocksProperties) {
    super("fanqiang:aws:AwsEcsShadowsocks", DEFAULT_RESOURCE_NAME);
    this.vpc = new Vpc(props.port, this);
    const cluster = new aws.ecs.Cluster("ssserver-default", undefined, {
      parent: this,
    });
    new aws.ecs.ClusterCapacityProviders(
      DEFAULT_RESOURCE_NAME,
      {
        clusterName: cluster.name,
        capacityProviders: ["FARGATE_SPOT"],
        defaultCapacityProviderStrategies: [
          { capacityProvider: "FARGATE_SPOT", base: 1, weight: 1 },
        ],
      },
      { parent: this }
    );
    const containerDefinition = new ContainerDefinition(props, this);
    const task = new aws.ecs.TaskDefinition(
      DEFAULT_RESOURCE_NAME,
      {
        containerDefinitions: containerDefinition.toJsonString(),
        executionRoleArn: containerDefinition.executionRole.arn,
        family: "shadowsocks",
        networkMode: "awsvpc",
        cpu: ".25 vCPU",
        memory: "0.5 GB",
        requiresCompatibilities: ["FARGATE"],
        runtimePlatform: {
          operatingSystemFamily: "LINUX",
          cpuArchitecture: "X86_64",
        },
      },
      { parent: this }
    );
    this.service = new aws.ecs.Service(
      DEFAULT_RESOURCE_NAME,
      {
        cluster: cluster.arn,
        taskDefinition: task.arn,
        name: "shadowsocks",
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

  get ipAddress(): pulumi.Output<string> {
    return this.service.id.apply(
      () =>
        aws.ec2.getNetworkInterfaceOutput({
          filters: [{ name: "vpc-id", values: [this.vpc.vpc.id] }],
        }).associations[0].publicIp
    );
  }
}

class ContainerDefinition {
  readonly logGroup: aws.cloudwatch.LogGroup;
  readonly executionRole: aws.iam.Role;
  constructor(readonly props: ShadowsocksProperties, parent: pulumi.Resource) {
    this.logGroup = new aws.cloudwatch.LogGroup("fanqiang", undefined, {
      parent,
    });
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
    this.executionRole = new aws.iam.Role(
      "awslogs-rw",
      {
        assumeRolePolicy: assumeRolePolicy.json,
        forceDetachPolicies: true,
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        ],
      },
      { parent }
    );
  }
  private containers(region: string, logGroup: string) {
    return [
      {
        name: "ssserver",
        image: "ghcr.io/shadowsocks/ssserver-rust:v1.15.2",
        portMappings: [
          { containerPort: this.props.port, hostPort: this.props.port },
        ],
        essential: true,
        command: [
          "ssserver",
          "--log-without-time",
          "-s",
          `[::]:${this.props.port}`,
          "-m",
          this.props.encryption,
          "-k",
          this.props.password,
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroup,
            "awslogs-region": region,
            "awslogs-stream-prefix": "ssserver",
          },
        },
      },
    ];
  }
  toJsonString(): pulumi.Output<string> {
    return pulumi
      .all([getRegion(), this.logGroup.name])
      .apply(([region, logGroup]) =>
        JSON.stringify(this.containers(region, logGroup))
      );
  }
}

class Vpc {
  readonly vpc: aws.ec2.Vpc;
  readonly subnet: aws.ec2.Subnet;
  readonly securityGroup: aws.ec2.SecurityGroup;
  constructor(port: number, parent: pulumi.Resource) {
    this.vpc = new aws.ec2.Vpc(
      DEFAULT_RESOURCE_NAME,
      {
        cidrBlock: "192.168.0.0/16",
      },
      { parent }
    );
    this.subnet = new aws.ec2.Subnet(
      DEFAULT_RESOURCE_NAME,
      {
        vpcId: this.vpc.id,
        cidrBlock: `192.168.0.0/24`,
      },
      { parent }
    );
    this.securityGroup = new aws.ec2.SecurityGroup(
      DEFAULT_RESOURCE_NAME,
      {
        vpcId: this.vpc.id,
        description: "For shadowsocks ecs fragate cluster",
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
      DEFAULT_RESOURCE_NAME,
      {
        vpcId: this.vpc.id,
      },
      { parent }
    );
    new aws.ec2.Route(
      DEFAULT_RESOURCE_NAME,
      {
        routeTableId: this.vpc.mainRouteTableId,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: gateway.id,
      },
      { parent }
    );
  }
}
