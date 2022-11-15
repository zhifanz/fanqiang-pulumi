import { applyProgram, assertConnectSuccess } from "./helper";
import { createShadowsocksServer } from "../lib/core/shadowsocksServer";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(async () => {
        const component = createShadowsocksServer({
          password: "test",
          port: 8388,
          encryption: "aes-256-gcm",
        });
        return { host: component.ipAddress };
      });
      const ip = result.outputs["host"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
