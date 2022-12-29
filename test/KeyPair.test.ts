import { assert } from "chai";
import { getKeyPair } from "../lib/core/KeyPair";

describe("KeyPair", () => {
  it("getKeyPair", () => {
    it("always return same key pair", () => {
      const result1 = getKeyPair();
      const result2 = getKeyPair();
      assert.isDefined(result1);
      assert.isDefined(result2);
      assert.strictEqual(result1, result2);
    });
  });
});
