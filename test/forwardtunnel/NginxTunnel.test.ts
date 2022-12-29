import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { applyProgram, assertConnectSuccess } from "../helper";
import { assert } from "chai";
import { NginxTunnel } from "../../lib/core/forwardtunnel/nginxTunnel";
import { Ansible } from "../../lib/core/Ansible";
import { getKeyPair } from "../../lib/core/KeyPair";

describe("NginxTunnel", function () {
  it("apply nginx tunnel", async function () {
    const result = await applyProgram(async () => {
      const host = new NginxTunnel(new Ansible(getKeyPair), {
        port: 8388,
        ipAddress: pulumi.output("0.0.0.0"),
      });
      return { host: host.ipAddress };
    });
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
