import { assertConnectSuccess, pulumiit } from "../helper";
import { ShadowsocksServer } from "../../lib/proxy/ShadowsocksServer";

describe("ShadowsocksServer", () => {
  describe("shadowsocks", () => {
    pulumiit(
      "checking proxy port open",
      async () => {
        const component = new ShadowsocksServer({
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        });
        return { host: component.ipAddress };
      },
      (result) => assertConnectSuccess(result.host, 8388)
    );
  });
});
