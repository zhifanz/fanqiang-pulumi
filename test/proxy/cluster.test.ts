import { assertConnectSuccess, pulumiit } from "../helper";
import { ProxyCluster } from "../../lib/proxy/cluster";
import _ from "lodash";

describe("cluster", () => {
  pulumiit(
    "create proxy for different regions",
    async (ansible) => {
      const cluster = new ProxyCluster(
        {
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        },
        await ansible(),
        ["ap-northeast-1", "eu-central-1"]
      );

      return _.mapValues(cluster.extra, (v) => v.ipAddress);
    },
    async (result) => {
      await assertConnectSuccess(result.ap, 22);
      await assertConnectSuccess(result.eu, 22);
    }
  );
});
