import * as common from "../lib/common";
import * as proxy from "../lib/proxy";
import { applyProgram, assertConnectSuccess } from "./helper";

describe("proxy", () => {
  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(() => {
        const bucket = common.apply("fanqiang-dev").bucket;
        return Promise.resolve(
          proxy.apply(bucket, {
            encryption: "aes-256-gcm",
            port: 8388,
            password: "foo",
          })
        );
      });
      const ip = result.outputs["publicIpAddress"].value;

      await assertConnectSuccess(ip, 8388);
    });
  });
});
