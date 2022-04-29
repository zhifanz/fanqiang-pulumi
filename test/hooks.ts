import { stackHolder } from "./helper";

export const mochaHooks = {
  async afterEach() {
    if (stackHolder.stack) {
      await stackHolder.stack.destroy({ onOutput: console.log });
      await stackHolder.stack.workspace.removeStack(stackHolder.stack.name);
      delete stackHolder.stack;
    }
  },
};
