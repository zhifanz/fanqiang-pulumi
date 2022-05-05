import { apply } from "../lib/tunnel";
import { applyProgram, assertConnectSuccess } from "./helper";

describe("tunnel", function () {
  it("apply infra", async function () {
    const result = await applyProgram(async () =>
      apply({ host: "0.0.0.0", port: 8388 }, { bandwidth: "50", maxPrice: "1" })
    );
    const ip = result.outputs["publicIpAddress"].value;
    await assertConnectSuccess(ip, 8388);
  });
});
