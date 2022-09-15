import * as pg from "pg";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import { getAccountId, getRegion } from "./utils";

export type RedshiftServerlessProperties = {
  workgroupName: string;
  adminUsername: string;
  adminUserPassword: string;
  dbName: string;
};
export class RedshiftServerless extends pulumi.ComponentResource {
  private static readonly type = "RedshiftServerless";
  private readonly namespace: aws.redshiftserverless.Namespace;
  private readonly workgroup: aws.redshiftserverless.Workgroup;
  get defaultResourceName(): string {
    return `${RedshiftServerless.type}-${DEFAULT_RESOURCE_NAME}`;
  }
  constructor(
    props: RedshiftServerlessProperties,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(RedshiftServerless.type, DEFAULT_RESOURCE_NAME, undefined, opts);
    const vpc = new aws.ec2.Vpc(
      this.defaultResourceName,
      {
        cidrBlock: "192.168.0.0/16",
      },
      { parent: this }
    );
    const subnets = aws
      .getAvailabilityZonesOutput({ state: "available" })
      .apply((result) =>
        result.names.map(
          (z, i) =>
            new aws.ec2.Subnet(
              `redshift-subnet-${i}`,
              {
                vpcId: vpc.id,
                availabilityZone: z,
                cidrBlock: `192.168.${i}.0/24`,
              },
              { parent: this }
            ).id
        )
      );

    const securityGroup = new aws.ec2.SecurityGroup(
      this.defaultResourceName,
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
            fromPort: 5439,
            toPort: 5439,
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
          },
        ],
      },
      { parent: this }
    );
    const internetGateway = new aws.ec2.InternetGateway(
      this.defaultResourceName,
      {
        vpcId: vpc.id,
      },
      { parent: this }
    );
    const routeTable = new aws.ec2.RouteTable(
      this.defaultResourceName,
      {
        vpcId: vpc.id,
        routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: internetGateway.id }],
      },
      { parent: this }
    );
    subnets.apply((all) =>
      all.forEach(
        (subnet, index) =>
          new aws.ec2.RouteTableAssociation(
            `${this.defaultResourceName}-${index}`,
            {
              routeTableId: routeTable.id,
              subnetId: subnet,
            },
            { parent: this }
          )
      )
    );
    this.namespace = new aws.redshiftserverless.Namespace(
      this.defaultResourceName,
      {
        namespaceName: "redshift",
        adminUsername: props.adminUsername,
        adminUserPassword: props.adminUserPassword,
        dbName: props.dbName,
      },
      { parent: this }
    );
    this.workgroup = new aws.redshiftserverless.Workgroup(
      this.defaultResourceName,
      {
        namespaceName: this.namespace.namespaceName,
        workgroupName: props.workgroupName,
        publiclyAccessible: true,
        subnetIds: subnets,
        securityGroupIds: [securityGroup.id],
      },
      { customTimeouts: { create: "30m" }, parent: this }
    );
    this.registerOutputs();
  }

  get host(): pulumi.Output<string> {
    return pulumi.interpolate`${
      this.workgroup.workgroupName
    }.${getAccountId()}.${getRegion()}.redshift-serverless.amazonaws.com`;
  }

  runSql(sql: string): pulumi.Output<void> {
    return this.executeQuery(async (client) => {
      const result = await client.query(sql);
      await pulumi.log.debug(
        `Successfully exectue sql query, ${result.rowCount} rows has been updated!`
      );
    });
  }

  batchInserts(sql: string, rows: any[][]): pulumi.Output<void> {
    return this.executeQuery(async (client) => {
      const resultPromises = rows.map((row) => {
        const query = { name: "batch-insert", text: sql, values: row };
        return client.query(query);
      });
      const results = await Promise.all(resultPromises);
      await pulumi.log.debug(
        `Successfully insert ${results.length} rows into database!`
      );
    });
  }

  private executeQuery(
    callback: (client: pg.Client) => Promise<void>
  ): pulumi.Output<void> {
    return pulumi
      .all([
        this.namespace.adminUsername,
        this.namespace.adminUserPassword,
        this.namespace.dbName,
        this.host,
      ])
      .apply(async ([user, password, database, host]) => {
        const client = new pg.Client({
          user,
          host,
          database,
          password,
          port: 5439,
        });
        await client.connect();
        try {
          await callback(client);
        } finally {
          await client.end();
        }
      });
  }
}
