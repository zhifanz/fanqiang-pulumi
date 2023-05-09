import { assertConnectSuccess, pulumiit } from "../helper";
import { MultiRegionProxyCluster } from "../../lib/proxy/MultiRegionProxyCluster";
import _ from "lodash";

describe("cluster", () => {
  pulumiit(
    "create proxy for different regions",
    async () => {
      const cluster = new MultiRegionProxyCluster(
        {
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        },
        ["ap-northeast-1", "eu-central-1"]
      );

      return _.mapValues(cluster.extra, (v) => v.ipAddress);
    },
    async (result) => {
      await assertConnectSuccess(result.ap, 8388);
      await assertConnectSuccess(result.eu, 8388);
    }
  );
});
