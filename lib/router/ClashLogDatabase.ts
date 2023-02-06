import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as aws from "@pulumi/aws";
import * as awsUtils from "../aws/utils";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import path from "node:path";

export type DatabaseProps = { user: string; password: string; name: string };
const ddl_script = path.join(__dirname, "ddl.sql");

export class ClashLogDatabase extends pulumi.ComponentResource {
  private readonly database: aws.lightsail.Database;

  get address(): pulumi.Output<string> {
    return this.database.masterEndpointAddress;
  }
  get port(): pulumi.Output<number> {
    return this.database.masterEndpointPort;
  }
  constructor(databaseProps: DatabaseProps, parent?: pulumi.Resource) {
    super("fanqiang:aws:ClashLogRepository", DEFAULT_RESOURCE_NAME, undefined, {
      parent,
    });
    this.database = new aws.lightsail.Database(
      "postgres",
      {
        availabilityZone: pulumi.concat(awsUtils.getRegion(), "a"),
        blueprintId: "postgres_12",
        bundleId: "micro_1_0",
        masterDatabaseName: databaseProps.name,
        masterPassword: databaseProps.password,
        masterUsername: databaseProps.user,
        relationalDatabaseName: "postgres",
        applyImmediately: true,
        publiclyAccessible: true,
        backupRetentionEnabled: false,
        skipFinalSnapshot: true,
      },
      { parent: this }
    );
    new command.local.Command(
      "populate-clashlogdatabase",
      {
        create: pulumi.interpolate`psql --host=${this.address} --port=${this.port} --file=${ddl_script}`,
        environment: {
          ANSIBLE_PYTHON_INTERPRETER: "auto_silent",
          PGDATABASE: databaseProps.name,
          PGUSER: databaseProps.user,
          PGPASSWORD: databaseProps.password,
        },
      },
      { parent: this }
    );
  }
}
