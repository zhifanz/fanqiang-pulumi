import { readFile } from "fs/promises";
import { connect } from "net";
import promiseRetry from "promise-retry";
import { apply } from "../lib/tunnel";
import { applyAlicloudProgram } from "./helper";
import * as os from "os";

describe("tunnel", function () {
  it("apply infra", async function () {
    const result = await applyAlicloudProgram(async () =>
      apply(
        { host: "0.0.0.0", port: 8388 },
        {
          bandwidth: "50",
          maxPrice: "1",
          publicKey: await readFile(
            os.homedir() + "/.ssh/id_ed25519.pub",
            "utf8"
          ),
        }
      )
    );
    const ip = result.outputs["publicIpAddress"].value;
    await promiseRetry(
      async (retry, number): Promise<void> => {
        try {
          await tryConnect(8388, ip);
        } catch (err) {
          retry(err);
        }
      },
      { retries: 10, maxRetryTime: 120 * 1000 }
    );
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
