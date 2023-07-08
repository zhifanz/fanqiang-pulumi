import * as pulumi from "@pulumi/pulumi";
import { assert } from "chai";
import { pulumiit } from "./helper";

describe("pulumi", () => {
  describe("output apply", () => {
    pulumiit(
      "output apply will execute before infrastructure construction complete",
      async () => {
        const foo = new Foo();
        const bar = new Bar(foo);
        return { count: pulumi.output(undefined).apply(() => bar.count) };
      },
      (result) => assert.equal(result.count, 7)
    );
  });
});

class Foo extends pulumi.ComponentResource {
  count = 0;
  constructor() {
    super("Foo", "default");
    pulumi.output(undefined).apply(() => (this.count = 7));
  }
}

class Bar extends pulumi.ComponentResource {
  count = 0;
  constructor(foo: Foo) {
    super("Bar", "default", undefined, { dependsOn: foo });
    pulumi.output(undefined).apply(() => (this.count = foo.count));
  }
}
