import * as pulumi from "@pulumi/pulumi";
import { applyProgram, assertConnectSuccess } from "./helper";
import { ClashRouterFactory } from "../lib/core/clashRouter";
import { BucketOperations } from "../lib/core/aws/BucketOperations";

describe("clashRouter", function () {
  it("apply clash tunnel", async function () {
    const result = await applyProgram(async () => {
      const bucketOperations = new BucketOperations("fanqiang-test");
      const factory = new ClashRouterFactory(bucketOperations);
      return factory.createClashRouter(
        {
          host: pulumi.output("0.0.0.0"),
          port: pulumi.output(8388),
          encryption: pulumi.output("aes-256-gcm"),
          password: pulumi.output("foo"),
        },
        process.env["PUBLIC_KEY"]
      );
    });
    const ip = result.outputs["host"].value;
    await assertConnectSuccess(ip, 7890);
  });
});
