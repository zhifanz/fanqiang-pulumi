import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function getRegion(): pulumi.Output<string> {
  return pulumi.output(aws.getRegion()).apply((r) => r.id);
}

export function getAccountId(): pulumi.Output<string> {
  return pulumi.output(aws.getCallerIdentity()).accountId;
}
