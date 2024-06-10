import { pulumiit } from "../helper";
import { AwsLightsail } from "../../lib/aws/AwsLightsail";
import { assert } from "chai";

describe("AwsLightsail", () => {
  pulumiit(
    "create lightsail instance",
    async () => {
      const foo = new AwsLightsail("foo");
      return { ipv4: foo.ipAddress, ipv6: foo.ipv6Address };
    },
    (result) => {
      assert.ok(result.ipv4);
      assert.ok(result.ipv6);
    }
  );
});
