import { assertConnectSuccess, pulumiit } from "../helper";
import { AwsEcsFargateShadowsocks } from "../../lib/proxy/AwsEcsFargateShadowsocks";

describe("AwsEcsFargateShadowsocks", () => {
  pulumiit(
    "checking proxy port open",
    async () => {
      const service = new AwsEcsFargateShadowsocks({
        password: "test",
        port: 8388,
        encryption: "aes-256-gcm",
      });
      return { host: service.ipAddress };
    },
    (result) => assertConnectSuccess(result.host, 8388)
  );
});
