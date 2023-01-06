import { applyProvisionProgram, assertConnectSuccess } from "../helper";
import { ShadowsocksServer } from "../../lib/proxy/shadowsocks";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProvisionProgram(async (ansible) => {
        const component = new ShadowsocksServer(
          {
            password: "test",
            port: 8388,
            encryption: "aes-256-gcm",
          },
          ansible
        );
        return { host: component.ipAddress };
      });
      const ip = result.outputs["host"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
