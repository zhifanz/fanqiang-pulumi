import { assertConnectSuccess, pulumiit } from "../helper";
import { ShadowsocksServer } from "../../lib/proxy/shadowsocks";

describe("proxy", () => {
  describe("shadowsocks", () => {
    pulumiit(
      "checking proxy port open",
      async (ansible) => {
        const component = new ShadowsocksServer(
          {
            password: "test",
            port: 8388,
            encryption: "aes-256-gcm",
          },
          await ansible()
        );
        return { host: component.ipAddress };
      },
      (result) => assertConnectSuccess(result.host, 8388)
    );
  });
});
