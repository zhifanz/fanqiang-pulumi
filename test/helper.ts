import project from "../package.json";
import {
  InlineProgramArgs,
  LocalWorkspace,
  PulumiFn,
  Stack,
  UpResult,
} from "@pulumi/pulumi/automation";
import net from "net";
import promiseRetry from "promise-retry";

export const stackHolder: { stack?: Stack } = {};

export async function applyProgram(
  program: PulumiFn,
  stackConfig?: Record<string, string>
): Promise<UpResult> {
  const stackArgs: InlineProgramArgs = {
    stackName: "test",
    projectName: project.name,
    program,
  };
  const stack = await LocalWorkspace.createOrSelectStack(stackArgs);
  stack.setConfig("alicloud:region", { value: "cn-shanghai" });
  stack.setConfig("aws:region", { value: "us-east-1" });
  if (stackConfig) {
    for (const k in stackConfig) {
      stack.setConfig(k, { value: stackConfig[k] });
    }
  }
  console.log("Downloading plugins...");
  await stack.workspace.installPlugin("aws", "v5.3.0");
  await stack.workspace.installPlugin("alicloud", "v3.19.0");
  console.log("Plugin download completed!");
  stackHolder.stack = stack;
  return stack.up({
    onOutput: console.log,
    onEvent: (event) => {
      if (event.diagnosticEvent?.severity == "error") {
        throw new Error(event.diagnosticEvent.message);
      }
    },
  });
}

export async function assertConnectSuccess(
  host: string,
  port: number
): Promise<void> {
  await promiseRetry(
    async (retry, number): Promise<void> => {
      try {
        await tryConnect(host, port);
      } catch (err) {
        retry(err);
      }
    },
    { retries: 10, maxRetryTime: 300 * 1000, minTimeout: 15 * 1000 }
  );
}

async function tryConnect(host: string, port: number): Promise<void> {
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
