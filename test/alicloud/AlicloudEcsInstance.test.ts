import { AlicloudEcsInstance } from "../../lib/alicloud/AlicloudEcsInstance";
import { pulumiit } from "../helper";
import assert from "node:assert";
import * as alicloud from "@pulumi/alicloud";
import { availableZones } from "../../lib/alicloud/AlicloudTunnelServiceSupport";

describe("AlicloudEciContainerGroup", () => {
  pulumiit(
    "vswitch",
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
  pulumiit(
    "successfully setup public ip for alicloud container group",
    async function () {
      const server = new AlicloudEcsInstance("alicloud-eci-test", 22, "");
      return { ipv4: server.ipAddress, ipv6: server.ipv6Address };
    },
    (result) => {
      assert.ok(result.ipv4);
      assert.ok(result.ipv6);
    }
  );
  pulumiit(
    "determine zone id",
    async function () {
      return { zones: availableZones().ids };
    },
    (result) => assert(result.zones.length)
  );
});
