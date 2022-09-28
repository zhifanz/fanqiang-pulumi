import { RequestRoutingRuleAnalysis } from "../../lib/core/analysis/RequestRoutingRuleAnalysis";
import { AgentUser } from "../../lib/core/aws/AgentUser";
import { BucketOperations } from "../../lib/core/aws/BucketOperations";
import { applyProgram } from "../helper";
import * as pulumi from "@pulumi/pulumi";

describe("RequestRoutingRuleAnalysis", () => {
  it("create infrastructures", async () => {
    await applyProgram(() => {
      const bucket = new BucketOperations("fanqiang-test");
      const agentUser = new AgentUser();
      agentUser.allowAccess(
        "s3",
        "s3:*",
        bucket.bucketArn,
        pulumi.concat(bucket.bucketArn, "/*")
      );
      new RequestRoutingRuleAnalysis(
        agentUser,
        bucket,
        "fanqiang",
        "admin",
        "Helloworld#1"
      );
      return Promise.resolve();
    });
  });
});
