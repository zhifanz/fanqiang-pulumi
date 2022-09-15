import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  basicAuthentication,
  DEFAULT_RESOURCE_NAME,
  getAwsRegion,
  waitConnectSuccess,
} from "../utils";

const INDEX_DEFINITION = {
  mappings: {
    properties: {
      access_timestamp: {
        type: "date",
        format: "date_time_no_millis",
      },
      protocol: { type: "keyword" },
      host: { type: "keyword" },
      port: { type: "integer" },
      rule: { type: "keyword" },
      proxy: { type: "keyword" },
    },
  },
} as const;

export class OpenSearchClashLogPersistentStrategy {
  constructor(
    readonly username: string,
    readonly password: string,
    readonly domain: string,
    readonly index: string
  ) {}
  apply(): { fluentbitConf: pulumi.Output<string> } {
    const opensearch = new aws.opensearch.Domain(DEFAULT_RESOURCE_NAME, {
      domainName: this.domain,
      domainEndpointOptions: {
        enforceHttps: true,
        tlsSecurityPolicy: "Policy-Min-TLS-1-0-2019-07",
      },
      ebsOptions: { ebsEnabled: true, volumeSize: 10, volumeType: "gp2" },
      clusterConfig: { instanceType: "t3.small.search", instanceCount: 3 },
      nodeToNodeEncryption: { enabled: true },
      encryptAtRest: { enabled: true },
      advancedSecurityOptions: {
        enabled: true,
        internalUserDatabaseEnabled: true,
        masterUserOptions: {
          masterUserName: this.username,
          masterUserPassword: this.password,
        },
      },
      engineVersion: "OpenSearch_1.3",
    });
    const policy = new aws.opensearch.DomainPolicy(DEFAULT_RESOURCE_NAME, {
      domainName: opensearch.domainName,
      accessPolicies: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {"AWS": "*" },
            "Action": "es:*",
            "Resource": "${opensearch.arn}/*"
          }
        ]
      }`,
    });
    if (this.index) {
      pulumi
        .all([opensearch.endpoint, policy.domainName])
        .apply(async ([endpoint, domain]) => {
          console.log("Creating opensearch index...");
          await waitConnectSuccess(endpoint, 443, 60 * 1000);
          const response = await fetch(`https://${endpoint}/${this.index}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Basic " + basicAuthentication(this.username, this.password),
            },
            body: JSON.stringify(INDEX_DEFINITION),
          });
          if (!response.ok) {
            throw new Error(
              `Connection error: ${
                response.statusText
              }, ${await response.text()}`
            );
          }
        });
    }
    return {
      fluentbitConf: this.fluentbitConf(opensearch.endpoint),
    };
  }

  private fluentbitConf(host: pulumi.Output<string>): pulumi.Output<string> {
    return pulumi.interpolate`
[OUTPUT]
    Name opensearch
    Match *
    Host ${host}
    Port 443
    HTTP_User ${this.username}
    HTTP_Passwd ${this.password}
    AWS_Region ${getAwsRegion()}
    Index ${this.index}
    tls On
`;
  }
}
