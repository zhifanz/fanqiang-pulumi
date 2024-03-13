import { AlicloudEcsSocatTunnel } from "../../lib/forwardtunnel/AlicloudEcsSocatTunnel";
import * as pulumi from "@pulumi/pulumi";
import { pulumiit } from "../helper";
import assert from "node:assert";
import dns from "node:dns/promises";

describe("AlicloudEciSocatTunnel", function () {
  pulumiit(
    "apply socat tunnel",
    async function () {
      const tunneledIps = await dns.resolve4("postman-echo.com");
      const instance = new AlicloudEcsSocatTunnel(
        "socat-test",
        {
          ipAddress: pulumi.output(tunneledIps[0]),
          port: 80,
        },
        "Fangqiang#1"
      );
      return { host: instance.ipAddress };
    },
    async (result) => {
      const res = await fetch(`http://${result.host}/get`);
      assert.strictEqual(res.status, 200);
    }
  );
});
