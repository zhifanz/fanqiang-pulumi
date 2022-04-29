import * as common from "../lib/common";
import * as proxy from "../lib/proxy";
import * as aws from "@pulumi/aws";
import { assert } from "chai";
import { connect } from "net";
import promiseRetry from "promise-retry";
import { applyProgram } from "./helper";

describe("proxy", () => {
  describe("aws", () => {
    it("getRegion without parameter", async () => {
      const result = await applyProgram(
        async () => ({ region: (await aws.getRegion()).name }),
        "us-west-2"
      );
      assert.equal(result.outputs["region"].value, "us-west-2");
    });
  });

  describe("shadowsocks", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(() => {
        const bucket = common.apply("fanqiang-dev").bucket;
        return proxy.apply(bucket, {
          encryption: "aes-256-gcm",
          port: 8388,
          password: "foo",
        });
      });
      const ip = result.outputs["publicIpAddress"].value;

      await promiseRetry(
        async (retry, number): Promise<void> => {
          try {
            await tryConnect(8388, ip);
          } catch (err) {
            retry(err);
          }
        },
        { retries: 20, maxRetryTime: 120 * 1000 }
      );
    });
  });
});

async function tryConnect(port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = connect(port, host);
    client.on("connect", () => {
      resolve();
      client.removeAllListeners().destroy();
    });
    client.on("error", (err: Error) => {
      reject(err);
      client.removeAllListeners().destroy();
    });
  });
}
