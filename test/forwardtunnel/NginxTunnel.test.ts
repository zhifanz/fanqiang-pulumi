import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { createStack, assertConnectSuccess, pulumiit } from "../helper";
import { assert } from "chai";
import { NginxTunnel } from "../../lib/forwardtunnel/NginxTunnel";

describe("NginxTunnel", function () {
  pulumiit(
    "apply nginx tunnel",
    async (ansible) => {
      const host = new NginxTunnel(await ansible(), {
        port: 8388,
        ipAddress: pulumi.output("0.0.0.0"),
      });
      return { host: host.ipAddress };
    },
    (result) => assertConnectSuccess(result.host, 8388)
  );

  pulumiit(
    "check region name",
    async () => ({ region: (await aws.getRegion()).id }),
    (result) => assert.equal(result.region, "ap-south-1"),
    { "aws:region": "ap-south-1" }
  );
});
