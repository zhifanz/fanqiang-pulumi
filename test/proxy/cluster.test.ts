import { applyProgram, assertConnectSuccess } from "../helper";
import { ProxyCluster } from "../../lib/core/proxy/cluster";
import { Ansible } from "../../lib/core/Ansible";
import { getKeyPair } from "../../lib/core/KeyPair";
import _ from "lodash";

describe("cluster", () => {
  it("create proxy for different regions", async () => {
    const result = await applyProgram(async () => {
      const cluster = new ProxyCluster(
        {
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        },
        new Ansible(getKeyPair),
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
