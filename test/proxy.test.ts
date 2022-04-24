import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import project from "../package.json";
import { apply } from "../lib/proxy";

describe("proxy", () => {
  it("checking proxy port open", async () => {
    const stackArgs: InlineProgramArgs = {
      stackName: "dev",
      projectName: project.name,
      program: apply,
    };
    const stack = await LocalWorkspace.createOrSelectStack(stackArgs);
    try {
      await stack.up({ onOutput: console.log });
    } finally {
      await stack.destroy({ onOutput: console.log });
      await stack.workspace.removeStack(stack.name);
    }
  });
});
