import _ from "lodash";

interface Foo {
  f1: string;
}

describe("AspectCapable", () => {
  const v: Foo = { f1: "h" };
  console.log(typeof v);
});
