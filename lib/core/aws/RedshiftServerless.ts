import * as pg from "pg";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { DEFAULT_RESOURCE_NAME, waitConnectSuccess } from "../utils";
import { getAccountId, getRegion } from "./utils";
import { VpcSubnets } from "./VpcSubnets";

export type RedshiftServerlessProperties = {
  workgroupName: string;
  adminUsername: string;
  adminUserPassword: string;
  dbName: string;
};
type RedshiftServerlessPropertiesOutput = Record<
  keyof RedshiftServerlessProperties,
  pulumi.Output<string>
>;
export class RedshiftServerless
  extends pulumi.ComponentResource
  implements RedshiftServerlessPropertiesOutput
{
  private static readonly type = "RedshiftServerless";
  private readonly namespace: aws.redshiftserverless.Namespace;
  private readonly workgroup: aws.redshiftserverless.Workgroup;

  get defaultResourceName(): string {
    return `${RedshiftServerless.type}-${DEFAULT_RESOURCE_NAME}`;
  }
  get workgroupName(): pulumi.Output<string> {
    return this.workgroup.workgroupName;
  }
  get adminUsername(): pulumi.Output<string> {
    return this.namespace.adminUsername;
  }
  get adminUserPassword(): pulumi.Output<string> {
    return <pulumi.Output<string>>this.namespace.adminUserPassword;
  }
  get dbName(): pulumi.Output<string> {
    return this.namespace.dbName;
  }
  get port(): number {
    return 5439;
  }
  constructor(
    props: RedshiftServerlessProperties,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(RedshiftServerless.type, DEFAULT_RESOURCE_NAME, undefined, opts);
    const vpc = new VpcSubnets("redshift", 6, 5439, {}, this);
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
        subnetIds: vpc.subnets.apply((subnets) => subnets.map((e) => e.id)),
        securityGroupIds: [vpc.securityGroup.id],
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

  get jdbcUrl(): pulumi.Output<string> {
    return pulumi.interpolate`jdbc:redshift://${this.host}:${this.port}/${this.dbName}`;
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
      .all([this.adminUsername, this.adminUserPassword, this.dbName, this.host])
      .apply(async ([user, password, database, host]) => {
        await waitConnectSuccess(host, this.port, 300 * 1000);
        const client = new pg.Client({
          user,
          host,
          database,
          password,
          port: this.port,
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
