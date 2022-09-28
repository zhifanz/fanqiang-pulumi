import { applyProgram, assertConnectSuccess } from "../helper";
import { AuroraServerless } from "../../lib/core/aws/AuroraServerless";

describe("AuroraServerless", () => {
  it("create aurora serverless", async () => {
    const result = await applyProgram(async function () {
      const aurora = new AuroraServerless("master", "Helloworld#1", "fanqiang");
      return { endpoint: aurora.endpoint, port: aurora.port };
    });
    const endpoint = result.outputs["endpoint"].value;
    const port = result.outputs["port"].value;
    assertConnectSuccess(endpoint, port);
  });
});
