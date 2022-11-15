import { assert } from "chai";

describe("node", function () {
  it("instanceof", function () {
    const myFoo: Foo = foo;
    assert.equal(myFoo(5), 6);
    assert.isTrue(myFoo instanceof Function);
    assert.isTrue({ a: 1, b: 2 } instanceof Object);
  });
});

class Bar {}
interface Foo {
  (val: number): number;
}

function foo(val: number) {
  return val + 1;
}
