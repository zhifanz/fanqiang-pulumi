import {
  FluentbitOutput,
  InternetAccessEventRepository,
} from "../../domain/RuleAnalyzer";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { getRegion } from "../aws/utils";

export function createPostgresInternetAccessEventRepository(
  masterPassword: string
): PostgresInternetAccessEventRepository {
  return new PostgresInternetAccessEventRepository(
    new aws.lightsail.Database("postgres", {
      availabilityZone: pulumi.concat(getRegion(), "a"),
      blueprintId: "postgres_12",
      bundleId: "micro_1_0",
      masterDatabaseName: "fanqiang",
      masterPassword,
      masterUsername: "guanliyuan",
      relationalDatabaseName: "postgres",
      applyImmediately: true,
      publiclyAccessible: true,
      skipFinalSnapshot: true,
    })
  );
}

export class PostgresInternetAccessEventRepository
  implements InternetAccessEventRepository
{
  constructor(readonly database: aws.lightsail.Database) {}

  get fluentbitOutput(): FluentbitOutput {
    return {
      Name: "pgsql",
      Match: "*",
      Host: this.database.masterEndpointAddress,
      Port: this.database.masterEndpointPort,
      User: this.database.masterUsername,
      Password: this.database.masterPassword,
      Database: this.database.masterDatabaseName,
      Table: "clash_log",
    };
  }
}
