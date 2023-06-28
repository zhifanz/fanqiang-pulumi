import {
  AlicloudEciContainerGroup,
  availableZones,
} from "../../lib/alicloud/AlicloudEciContainerGroup";
import { assertConnectSuccess, pulumiit } from "../helper";
import assert from "node:assert";

describe("AlicloudEciContainerGroup", () => {
  pulumiit(
    "successfully setup public ip for alicloud container group",
    async function () {
      const server = new AlicloudEciContainerGroup("alicloud-eci-test", 80, {
        image: "nginx",
      });
      return { host: server.ipAddress };
    },
    (result) => assertConnectSuccess(result.host, 80)
  );
  pulumiit(
    "determine zone id",
    async function () {
      return { zones: availableZones().ids };
    },
    (result) => assert(result.zones.length)
  );
});
