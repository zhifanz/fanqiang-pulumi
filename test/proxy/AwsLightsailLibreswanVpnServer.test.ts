import { pulumiit } from "../helper";
import { create } from "../../lib/proxy/AwsLightsailLibreswanVpnServer";
import { BucketOperations } from "../../lib/aws/BucketOperations";
import { assert } from "chai";

describe("AwsLightsailLibreswanVpnServer", () => {
  pulumiit(
    "basic deploy",
    async () => {
      const vpn = create(new BucketOperations("fanqiang-test"));
      return { ip: vpn.ipAddress };
    },
    (result) => assert.isDefined(result.ip)
  );
});
