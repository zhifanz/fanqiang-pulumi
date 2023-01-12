import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import project from "../package.json";
import {
  InlineProgramArgs,
  LocalWorkspace,
  PulumiFn,
  Stack,
  UpResult,
} from "@pulumi/pulumi/automation";
import { waitConnectSuccess } from "../lib/utils";
import { Ansible } from "../lib/Ansible";
import { KeyPairHolder } from "../lib/ssh";

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
  await stack.setConfig("alicloud:region", { value: "cn-shanghai" });
  await stack.setConfig("aws:region", { value: "us-east-1" });
  if (stackConfig) {
    for (const k in stackConfig) {
      await stack.setConfig(k, { value: stackConfig[k] });
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
      if (
        event.diagnosticEvent?.severity == "error" ||
        event.diagnosticEvent?.severity == "info#err"
      ) {
        throw new Error(event.diagnosticEvent.message);
      }
    },
  });
}

export async function applyProvisionProgram(
  program: (ansible: Ansible) => ReturnType<PulumiFn>
) {
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "fanqiang-"));
  try {
    const keyPairHolder = new KeyPairHolder(tmpdir);
    const ansilbe = await Ansible.create(keyPairHolder.get);
    return applyProgram(() => program(ansilbe));
  } finally {
    await fs.rm(tmpdir, { recursive: true });
  }
}

export async function assertConnectSuccess(
  host: string,
  port: number
): Promise<void> {
  await waitConnectSuccess(host, port, 300 * 1000);
}
