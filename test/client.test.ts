import { readFile } from "fs/promises";
import * as client from "../lib/client";
import * as common from "../lib/common";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { applyProgram } from "./helper";
import { assert } from "chai";
import got from "got";

describe("client", function () {
  it("successfully upload clash config file to s3", async function () {
    const expectedContent = await readFile(
      __dirname + "/clash-config.yaml",
      "utf8"
    );
    const result = await applyProgram(() => {
      const bucket = common.apply("fanqiang-dev").bucket;
      return client.apply(bucket, {
        host: "0.0.0.0",
        port: 8388,
        password: "foo",
        encryption: "plain",
      });
    });
    const clashConfig = await got
      .get(result.outputs["clashConfigUrl"].value)
      .text();
    assert.equal(clashConfig, expectedContent);
  });
});
