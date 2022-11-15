import { assert } from "chai";

describe("CloudServer", () => {
  it("return default value when parameter is undefined", function () {
    assert.equal(foo("hi"), "hi");
    assert.equal(foo(""), "");
    assert.equal(foo(), "");
    assert.equal(foo(undefined), "");
  });
});

function foo(arg: string = ""): string {
  return arg;
}
