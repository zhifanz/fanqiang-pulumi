import project from "../package.json";
import {
  InlineProgramArgs,
  LocalWorkspace,
  PulumiFn,
  Stack,
} from "@pulumi/pulumi/automation";
import { waitConnectSuccess } from "../lib/utils";
import { Ansible } from "../lib/Ansible";
import _ from "lodash";

export async function assertConnectSuccess(
  host: string,
  port: number
): Promise<void> {
  await waitConnectSuccess(host, port, 300 * 1000);
}

class PulumiTestingContext {
  ansible?: Ansible;

  getAnsible = async () => {
    if (!this.ansible) {
      this.ansible = await Ansible.create();
    }
    return this.ansible;
  };
}

export async function createStack(
  program: PulumiFn,
  stackConfig?: Record<string, string>
): Promise<Stack> {
  const stackArgs: InlineProgramArgs = {
    stackName: "test",
    projectName: project.name,
    program,
  };
  const stack = await LocalWorkspace.createOrSelectStack(stackArgs);
  if (stackConfig) {
    for (const k in stackConfig) {
      await stack.setConfig(k, { value: stackConfig[k] });
    }
  }
  await stack.workspace.installPlugin("aws", "v5.15.0");
  await stack.workspace.installPlugin("alicloud", "v3.19.0");
  return stack;
}

export async function pulumiit(
  title: string,
  program: (getAnsible: () => Promise<Ansible>) => ReturnType<PulumiFn>,
  asserts: (outputs: Record<string, any>) => void | Promise<void>,
  stackConfig?: Record<string, string>
) {
  it(title, async () => {
    const context = new PulumiTestingContext();
    let stack: Stack | undefined;
    try {
      stack = await createStack(() => program(context.getAnsible), stackConfig);
      const result = await stack.up({
        onOutput: (out) => process.stdout.write(out),
        onEvent: (event) => {
          if (
            event.diagnosticEvent?.severity == "error" ||
            event.diagnosticEvent?.severity == "info#err"
          ) {
            throw new Error(event.diagnosticEvent.message);
          }
        },
      });
      await asserts(_.mapValues(result.outputs, (o) => o.value));
    } finally {
      if (stack) {
        await stack.destroy({ onOutput: (out) => process.stdout.write(out) });
        await stack.workspace.removeStack(stack.name);
      }
    }
  });
}
