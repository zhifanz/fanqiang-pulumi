import * as common from "../lib/common";
import * as proxy from "../lib/proxy";
import { applyProgram, assertConnectSuccess } from "./helper";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(() => {
        const bucket = common.apply("fanqiang-dev").bucket;
        const component = new proxy.LightsailShadowsocksProxy("test", bucket, {
          encryption: "aes-256-gcm",
          port: 8388,
          password: "foo",
        });
        return Promise.resolve({ publicIpAddress: component.publicIpAddress });
      });
      const ip = result.outputs["publicIpAddress"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
