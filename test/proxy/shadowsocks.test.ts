import { applyProgram, assertConnectSuccess } from "../helper";
import { ShadowsocksServer } from "../../lib/core/proxy/shadowsocks";
import { Ansible } from "../../lib/core/Ansible";
import { getKeyPair } from "../../lib/core/KeyPair";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(async () => {
        const component = new ShadowsocksServer(
          {
            password: "test",
            port: 8388,
            encryption: "aes-256-gcm",
          },
          new Ansible(getKeyPair)
        );
        return { host: component.ipAddress };
      });
      const ip = result.outputs["host"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
