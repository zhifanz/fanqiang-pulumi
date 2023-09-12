import { pulumiit } from "../helper";
import { determineAmi } from "../../lib/proxy/LibreswanVpnServer";
import { assert } from "chai";

describe("LibreswanVpnServer", () => {
  pulumiit(
    "determineAmi return Amazon Linux 2 kernel",
    async () => {
      const amis = await determineAmi();
      return { amis: amis };
    },
    (result) =>
      assert.isTrue(result.amis.description.includes("Amazon Linux 2 Kernel"))
  );
});
