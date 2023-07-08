import * as net from "node:net";
import promiseRetry from "promise-retry";

export const DEFAULT_RESOURCE_NAME = "default";

export async function tryConnect(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, host);
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

export async function waitConnectSuccess(
  host: string,
  port: number,
  timeout: number
): Promise<void> {
  await promiseRetry(
    async (retry, number): Promise<void> => {
      try {
        await tryConnect(host, port);
      } catch (err) {
        retry(err);
      }
    },
    { retries: 10, maxRetryTime: timeout, minTimeout: 10 * 1000 }
  );
}
