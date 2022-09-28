import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import _ from "lodash";
import { InstanceConfigurer } from "../InstanceConfigurer";
import { BucketOperations } from "../aws/BucketOperations";
import * as path from "node:path";
import { AgentUser } from "../aws/AgentUser";
import { AuroraServerless } from "../aws/AuroraServerless";

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

export class RequestRoutingRuleAnalysis extends pulumi.ComponentResource {
  constructor(
    agentUser: AgentUser,
    bucketOperations: BucketOperations,
    dbName: string,
    adminUsername: string,
    adminUserPassword: string
  ) {
    super("RuleAnalysis", DEFAULT_RESOURCE_NAME);

    const aurora = new AuroraServerless(
      adminUsername,
      adminUserPassword,
      dbName,
      { parent: this }
    );

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
    bucketOperations.uploadContent(
      "router/fluent-bit.conf",
      fluentbitConf(aurora),
      { parent: this }
    );
    this.registerOutputs();
  }

  private configureFirehose(
    bucketArn: pulumi.Input<string>,
    agentUser: AgentUser,
    redshiftConfiguration: {
      clusterJdbcurl: pulumi.Input<string>;
      username: pulumi.Input<string>;
      password: pulumi.Input<string>;
      dataTableName: pulumi.Input<string>;
    }
  ): aws.kinesis.FirehoseDeliveryStream {
    const role = new aws.iam.Role(
      "firehose",
      {
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: {
            Effect: "Allow",
            Principal: { Service: "firehose.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        }),
        inlinePolicies: [
          {
            policy: pulumi.output(bucketArn).apply((arn) =>
              JSON.stringify({
                Version: "2012-10-17",
                Statement: {
                  Effect: "Allow",
                  Action: "s3:*",
                  Resource: [arn, arn + "/*"],
                },
              })
            ),
          },
          {
            policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: { Effect: "Allow", Action: "glue:*", Resource: "*" },
            }),
          },
        ],
      },
      { parent: this }
    );

    const firehose = new aws.kinesis.FirehoseDeliveryStream(
      DEFAULT_RESOURCE_NAME,
      {
        destination: "redshift",
        redshiftConfiguration: {
          ...redshiftConfiguration,
          roleArn: role.arn,
        },
        s3Configuration: { bucketArn, roleArn: role.arn },
      },
      { parent: this }
    );
    agentUser.allowAccess("firehose", "firehose:PutRecordBatch", firehose.arn);
    return firehose;
  }

  configureInstance(configurer: InstanceConfigurer): void {
    const dc = configurer.getDockerCompose();
    dc.addFile("docker-compose.fluentbit.yml");
    dc.insertService("fluentbit", 0);
  }
}

function fluentbitConf(aurora: AuroraServerless): pulumi.Output<string> {
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
  
[OUTPUT]
  Name pgsql
  Match *
  Host ${aurora.endpoint}
  Port ${aurora.port}
  User ${aurora.username}
  Password ${aurora.password}
  Database ${aurora.database}
  Table clash_logs`;
}
