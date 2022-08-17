import { applyProgram, assertConnectSuccess } from "./helper";
import { LightsailShadowsocksProxy } from "../lib/core/proxy/LightsailShadowsocksProxy";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(async () => {
        const component = new LightsailShadowsocksProxy(
          "test",
          8388,
          "aes-256-gcm",
          "foo"
        );
        return { host: component.host };
      });
      const ip = result.outputs["host"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
