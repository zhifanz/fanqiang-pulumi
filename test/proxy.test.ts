import {
  InlineProgramArgs,
  LocalWorkspace,
  PulumiFn,
  Stack,
  UpResult,
} from "@pulumi/pulumi/automation";
import project from "../package.json";
import { apply } from "../lib/proxy";
import * as aws from "@pulumi/aws";
import { assert } from "chai";
import { SocketAddress, connect } from "net";
import promiseRetry from "promise-retry";

describe("proxy", () => {
  let stack: Stack;

  afterEach(async () => {
    if (stack) {
      await stack.destroy({ onOutput: console.log });
      await stack.workspace.removeStack(stack.name);
    }
  });

  async function applyProgram(
    program: PulumiFn,
    region: string
  ): Promise<UpResult> {
    const stackArgs: InlineProgramArgs = {
      stackName: "test",
      projectName: project.name,
      program,
    };
    stack = await LocalWorkspace.createOrSelectStack(stackArgs);
    await stack.setConfig("aws:region", { value: region });
    await stack.workspace.installPlugin("aws", "v5.2.0");
    return stack.up({
      onOutput: console.log,
      onEvent: (event) => {
        if (event.diagnosticEvent?.severity == "error") {
          throw new Error(event.diagnosticEvent.message);
        }
      },
    });
  }

  describe("aws", () => {
    it("getRegion without parameter", async () => {
      const result = await applyProgram(
        async () => ({
          region: (await aws.getRegion()).name,
        }),
        "us-west-2"
      );
      assert.equal(result.outputs["region"].value, "us-west-2");
    });
  });

  describe("lightsail", () => {
    it("checking proxy port open", async () => {
      const result = await applyProgram(
        () =>
          apply("fanqiang-dev", {
            encryption_algorithm: "aes-256-gcm",
            port: 8388,
            password: "foo",
          }),
        "us-east-1"
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
