import { applyProvisionProgram, assertConnectSuccess } from "../helper";
import { ProxyCluster } from "../../lib/core/proxy/cluster";
import _ from "lodash";

describe("cluster", () => {
  it("create proxy for different regions", async () => {
    const result = await applyProvisionProgram(async (ansible) => {
      const cluster = new ProxyCluster(
        {
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        },
        ansible,
        ["ap-northeast-1", "eu-central-1"]
      );

      return _.mapValues(cluster.extra, (v) => v.ipAddress);
    });
    const ap = result.outputs["ap"].value;
    const eu = result.outputs["eu"].value;

    await assertConnectSuccess(ap, 22);
    await assertConnectSuccess(eu, 22);
  });
});
