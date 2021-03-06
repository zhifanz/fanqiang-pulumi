import project from "../package.json";
import {
  InlineProgramArgs,
  LocalWorkspace,
  PulumiFn,
  Stack,
  UpResult,
} from "@pulumi/pulumi/automation";

export const stackHolder: { stack?: Stack } = {};

export async function applyProgram(
  program: PulumiFn,
  region: string = "us-east-1"
): Promise<UpResult> {
  const stackArgs: InlineProgramArgs = {
    stackName: "test",
    projectName: project.name,
    program,
  };
  const stack = await LocalWorkspace.createOrSelectStack(stackArgs);
  await stack.setConfig("aws:region", { value: region });
  await stack.workspace.installPlugin("aws", "v5.2.0");
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
