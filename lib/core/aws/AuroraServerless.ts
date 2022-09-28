import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { VpcSubnets } from "./VpcSubnets";

export class AuroraServerless extends pulumi.ComponentResource {
  private readonly cluster: aws.rds.Cluster;
  private readonly clusterInstance: aws.rds.ClusterInstance;
  readonly port = 5432;
  private static get cname(): string {
    return AuroraServerless.name.toLowerCase();
  }
  constructor(
    readonly username: string,
    readonly password: string,
    readonly database: string,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(
      "fanqiang:aws:AuroraServerless",
      AuroraServerless.cname,
      undefined,
      opts
    );
    const vpc = new VpcSubnets(
      AuroraServerless.cname,
      3,
      this.port,
      { enableDnsSupport: true, enableDnsHostnames: true },
      this
    );
    const subnetGroup = new aws.rds.SubnetGroup(
      AuroraServerless.cname,
      { subnetIds: vpc.subnets.apply((subnets) => subnets.map((e) => e.id)) },
      { parent: this }
    );
    this.cluster = new aws.rds.Cluster(
      AuroraServerless.cname,
      {
        applyImmediately: true,
        availabilityZones: aws
          .getAvailabilityZonesOutput({
            state: "available",
          })
          .names.apply((names) =>
            names.length <= 3 ? names : names.slice(0, 3)
          ),
        dbSubnetGroupName: subnetGroup.name,
        databaseName: database,
        enableHttpEndpoint: true,
        engine: "aurora-postgresql",
        engineMode: "provisioned",
        engineVersion: "13.7",
        masterUsername: username,
        masterPassword: password,
        serverlessv2ScalingConfiguration: { minCapacity: 1, maxCapacity: 16 },
        skipFinalSnapshot: true,
        vpcSecurityGroupIds: [vpc.securityGroup.id],
      },
      { parent: this }
    );
    this.clusterInstance = new aws.rds.ClusterInstance(
      AuroraServerless.cname,
      {
        clusterIdentifier: this.cluster.id,
        instanceClass: "db.serverless",
        engine: "aurora-postgresql",
        engineVersion: this.cluster.engineVersion,
        publiclyAccessible: true,
        dbSubnetGroupName: subnetGroup.name,
      },
      { parent: this }
    );
  }

  get endpoint(): pulumi.Output<string> {
    return this.clusterInstance.endpoint;
  }
}
