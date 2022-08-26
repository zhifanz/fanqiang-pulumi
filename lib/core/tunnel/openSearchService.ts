import * as crypto from "node:crypto";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  basicAuthentication,
  DEFAULT_RESOURCE_NAME,
  waitConnectSuccess,
} from "../utils";

type OpenSearchAccessInfo = Record<
  "username" | "password" | "endpoint" | "arn",
  pulumi.Output<string>
>;

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

export function createOpenSearchService(
  domainName: string,
  index?: string
): OpenSearchAccessInfo {
  const username = "admin";
  const password = randomPassword(16);
  const opensearch = new aws.opensearch.Domain(DEFAULT_RESOURCE_NAME, {
    domainName: domainName,
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
        masterUserName: username,
        masterUserPassword: password,
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
  if (index) {
    pulumi
      .all([opensearch.endpoint, policy.domainName])
      .apply(async ([endpoint, domain]) => {
        console.log("Creating opensearch index...");
        await waitConnectSuccess(endpoint, 443, 60 * 1000);
        const response = await fetch(`https://${endpoint}/${index}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + basicAuthentication(username, password),
          },
          body: JSON.stringify(INDEX_DEFINITION),
        });
        if (!response.ok) {
          throw new Error(
            `Connection error: ${response.statusText}, ${await response.text()}`
          );
        }
      });
  }
  return {
    username: pulumi.output(username),
    password: pulumi.output(password),
    endpoint: opensearch.endpoint,
    arn: opensearch.arn,
  };
}

function randomPassword(length: number): string {
  return crypto.randomBytes(length).toString("base64");
}
