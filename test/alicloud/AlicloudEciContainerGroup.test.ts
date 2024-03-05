import { pulumiit } from "../helper";
import assert from "node:assert";
import * as alicloud from "@pulumi/alicloud";

describe("AlicloudAutoProvisioningGroup", () => {
  pulumiit(
    "create provisioning group",
    async function () {
      const vpc = new alicloud.vpc.Network("default-test", {
        cidrBlock: "192.168.0.0/16",
        enableIpv6: true,
      });
      const vs = new alicloud.vpc.Switch("default-test", {
        zoneId: "cn-shanghai-b",
        vpcId: vpc.id,
        cidrBlock: "192.168.0.0/24",
        enableIpv6: true,
      });

      return { block: vs.ipv6CidrBlock, mask: vs.ipv6CidrBlockMask };
    },
    async (result) => {
      assert.ok(result.block);
      assert.ok(result.mask);
    }
  );
});
