import { stackHolder } from "./helper";

export const mochaHooks = {
  async afterEach() {
    if (stackHolder.stack) {
      await stackHolder.stack.destroy({ onOutput: console.log });
      delete stackHolder.stack;
    }
  },
};
