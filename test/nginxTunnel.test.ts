import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { applyProgram, assertConnectSuccess } from "./helper";
import { assert } from "chai";
import { createNginxTunnel } from "../lib/core/nginxTunnel";

describe("nginxTunnel", function () {
  it("apply nginx tunnel", async function () {
    const result = await applyProgram(async () =>
      createNginxTunnel(
        {
          host: pulumi.output("0.0.0.0"),
          port: pulumi.output(8388),
        },
        process.env["PUBLIC_KEY"]
      )
    );
    const ip = result.outputs["host"].value;
    await assertConnectSuccess(ip, 8388);
  });

  it("check region name", async function () {
    const result = await applyProgram(
      async () => {
        return { region: (await aws.getRegion()).id };
      },
      { "aws:region": "ap-south-1" }
    );
    assert.equal(result.outputs["region"].value, "ap-south-1");
  });
});
