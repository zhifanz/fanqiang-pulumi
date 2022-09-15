import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import { getRegion } from "../aws/utils";
import _ from "lodash";
import { Client } from "pg";
import { RedshiftServerless } from "../aws/RedshiftServerless";
import { ComponentResource } from "@pulumi/pulumi";
import { AgentUser } from "../aws/AgentUser";
import { InstanceConfigurer } from "../InstanceConfigurer";
import { BucketOperations } from "../aws/BucketOperations";
import * as path from "node:path";

const CREATE_TABLE_SQL = `
create table internet_access_events (
    access_timestamp timestamp not null,
    protocol varchar not null,
    host varchar sortkey not null,
    port integer not null,
    rule varchar not null,
    proxy varchar not null
)
distkey(access_timestamp)
`;

export class RequestRoutingRuleAnalysis extends ComponentResource {
  constructor(
    agentUser: AgentUser,
    bucketOperations: BucketOperations,
    workgroupName: string,
    dbName: string,
    adminUsername: string,
    adminUserPassword: string
  ) {
    super("RuleAnalysis", DEFAULT_RESOURCE_NAME);
    bucketOperations.uploadSource(
      "router/fluent-bit-parsers.conf",
      path.join(__dirname, "fluent-bit-parsers.conf"),
      { parent: this }
    );
    bucketOperations.uploadSource(
      "router/docker-compose.fluentbit.yml",
      path.join(__dirname, "docker-compose.fluentbit.yml"),
      { parent: this }
    );
    const logGroup = new aws.cloudwatch.LogGroup(
      DEFAULT_RESOURCE_NAME,
      {
        namePrefix: "fanqiang",
        retentionInDays: 1,
      },
      { parent: this }
    );

    const logStream = new aws.cloudwatch.LogStream(
      DEFAULT_RESOURCE_NAME,
      {
        logGroupName: logGroup.name,
        name: "clash-router",
      },
      { parent: this }
    );
    bucketOperations.uploadContent(
      "router/fluent-bit.conf",
      fluentbitConf(logGroup.name, logStream.name),
      { parent: this }
    );
    agentUser.allowAccess(
      "logGroup",
      "logs:*",
      pulumi.concat(logGroup.arn, ":*")
    );

    const redshift = new RedshiftServerless(
      {
        workgroupName,
        adminUsername,
        adminUserPassword,
        dbName,
      },
      { parent: this }
    );
    redshift.runSql(CREATE_TABLE_SQL);
    redshift.host.apply((host) =>
      logGroup.onDecodedEvent(DEFAULT_RESOURCE_NAME, async (event, context) => {
        const client = new Client({
          host,
          user: adminUsername,
          database: dbName,
          password: adminUserPassword,
          port: 5439,
        });
        await client.connect();
        try {
          const requests = event.logEvents.map((e) => {
            const d = JSON.parse(e.message);
            return client.query(
              "insert into internet_access_events values($1, $2, $3, $4, $5, $6)",
              [
                d["access_timestamp"],
                d["protocol"],
                d["host"],
                d["port"],
                d["rule"],
                d["proxy"],
              ]
            );
          });
          await Promise.all(requests);
          console.log("Insert row success!");
        } finally {
          await client.end();
        }
      })
    );
  }
  configureInstance(configurer: InstanceConfigurer): void {
    const dc = configurer.getDockerCompose();
    dc.addFile("docker-compose.fluentbit.yml");
    dc.insertService("fluentbit", 0);
  }
}

function fluentbitConf(
  logGroup: pulumi.Input<string>,
  logStream: pulumi.Input<string>
): pulumi.Output<string> {
  return pulumi.interpolate`
[SERVICE]
  parsers_file /fluent-bit/etc/fluent-bit-parsers.conf

[INPUT]
  name forward

[FILTER]
  name parser
  match *
  key_name log
  parser info

[FILTER]
  name grep
  match *
  exclude log .+

[OUTPUT]
  Name cloudwatch_logs
  Match *
  region ${getRegion()}
  log_group_name ${logGroup}
  log_stream_name ${logStream}
  tls.verify false
`;
}
