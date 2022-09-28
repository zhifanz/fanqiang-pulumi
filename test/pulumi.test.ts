import * as pulumi from "@pulumi/pulumi";
import { assert } from "chai";
import { applyProgram } from "./helper";

describe("pulumi", () => {
  describe("output apply", () => {
    it("output apply will execute before infrastructure construction complete", async () => {
      const result = await applyProgram(async function () {
        const foo = new Foo();
        const bar = new Bar(foo);
        return { count: bar.count };
      });
      assert.equal(result.outputs["count"].value, 7);
    });
  });
});

class Foo extends pulumi.ComponentResource {
  count: number;
  constructor() {
    super("Foo", "default");
    this.count = 0;
    const noop = pulumi.output("noop").apply(() => {
      this.count += 7;
    });

    this.registerOutputs({ noop });
  }
}

class Bar extends pulumi.ComponentResource {
  count: number;
  constructor(foo: Foo) {
    super("Bar", "default", undefined, { dependsOn: foo });
    this.count = foo.count;
  }
}
