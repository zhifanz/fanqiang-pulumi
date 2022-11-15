import * as pulumi from "@pulumi/pulumi";
import * as yaml from "yaml";
import { applyProgram } from "./helper";
import { ClashRouterFactory } from "../lib/core/router/clashRouter";
import { BucketOperations } from "../lib/core/aws/BucketOperations";
import { waitConnectSuccess } from "../lib/core/utils";
import { assert } from "chai";

describe("nginxTunnel", function () {
  it("apply clash router", async function () {
    const result = await applyProgram(async () => {
      const host = new ClashRouterFactory(
        new BucketOperations("fanqiang-test")
      ).createClashRouter(
        {
          ipAddress: pulumi.output("8.8.8.8"),
          port: 8388,
          encryption: "aes-256-gcm",
          password: "Secret#1",
        },
        8388,
        process.env["PUBLIC_KEY"]
          ? {
              publicKeys: [process.env["PUBLIC_KEY"]],
            }
          : undefined
      );
      return { host: host.ipAddress };
    });
    const ip = result.outputs["host"].value;
    await waitConnectSuccess(ip, 8388, 60 * 1000);
  });

  it("yaml stringify", function () {
    const result = yaml.stringify({ payload: ["noop"] });
    assert.equal(result, "payload:\n  - noop\n");
  });
});
