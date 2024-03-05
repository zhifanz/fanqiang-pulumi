import { AlicloudEciSocatTunnel } from "../../lib/forwardtunnel/AlicloudEciSocatTunnel";
import * as pulumi from "@pulumi/pulumi";
import { pulumiit } from "../helper";
import assert from "node:assert";
import * as dns from "node:dns/promises";

describe("AlicloudEciSocatTunnel", function () {
  pulumiit(
    "apply socat tunnel",
    async function () {
      const tunneledIps = await dns.resolve4("aliyun.com");
      const ipv6s = await dns.resolve6("aliyun.com");
      const instance =
        await AlicloudEciSocatTunnel.newInstanceWithCurrentRegion(
          "socat-test",
          {
            ipAddress: pulumi.output(tunneledIps[0]),
            ipv6Address: pulumi.output(ipv6s[0]),
            port: 80,
          }
        );
      return { host: instance.ipAddress };
    },
    async (result) => {
      const res = await fetch(`http://${result.host}/get`);
      assert.strictEqual(res.status, 200);
    }
  );
});
