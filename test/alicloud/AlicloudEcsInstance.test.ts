import { AlicloudEcsInstance } from "../../lib/alicloud/AlicloudEcsInstance";
import { pulumiit } from "../helper";
import assert from "node:assert";

describe("AlicloudEcsInstance", () => {
  pulumiit(
    "successfully setup ecs instance with ipv6 address",
    async function () {
      const server = new AlicloudEcsInstance(
        "alicloud-eci-test",
        22,
        "",
        "Helloworld#1"
      );
      return { ipv4: server.ipAddress, ipv6: server.ipv6Address };
    },
    (result) => {
      assert.ok(result.ipv4);
      assert.ok(result.ipv6);
    }
  );
});
