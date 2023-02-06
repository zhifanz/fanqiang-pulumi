import * as pulumi from "@pulumi/pulumi";
import { assert } from "chai";
import { applyProgram } from "./helper";

describe("pulumi", () => {
  describe("output apply", () => {
    it("output apply will execute before infrastructure construction complete", async () => {
      const result = await applyProgram(async function () {
        const foo = new Foo();
        const bar = new Bar(foo);
        return { count: pulumi.output(undefined).apply(() => bar.count) };
      });
      assert.equal(result.outputs["count"].value, 7);
    });
  });
});

class Foo extends pulumi.ComponentResource {
  count: number = 0;
  constructor() {
    super("Foo", "default");
    pulumi.output(undefined).apply(() => (this.count = 7));
  }
}

class Bar extends pulumi.ComponentResource {
  count: number = 0;
  constructor(foo: Foo) {
    super("Bar", "default", undefined, { dependsOn: foo });
    pulumi.output(undefined).apply(() => (this.count = foo.count));
  }
}
