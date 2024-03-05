import { AlicloudEcsSocatTunnel } from "../../lib/forwardtunnel/AlicloudEcsSocatTunnel";
import * as pulumi from "@pulumi/pulumi";
import { pulumiit } from "../helper";
import assert from "node:assert";

describe("AlicloudEciSocatTunnel", function () {
  pulumiit(
    "apply socat tunnel",
    async function () {
      const instance = new AlicloudEcsSocatTunnel("socat-test", {
        ipAddress: pulumi.output("postman-echo.com"),
        port: 443,
      });
      return { host: instance.ipAddress };
    },
    async (result) => {
      const res = await fetch(`https://${result.host}/get`);
      assert.strictEqual(res.status, 200);
    }
  );
});
