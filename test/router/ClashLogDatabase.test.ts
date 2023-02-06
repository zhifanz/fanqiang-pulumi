import { ClashLogDatabase } from "../../lib/router/ClashLogDatabase";
import { applyProgram } from "../helper";
import { assert } from "chai";

describe("ClashLogDatabase", () => {
  it("ddl script execute successfully", async function () {
    const result = await applyProgram(async () => {
      const db = new ClashLogDatabase({
        user: "test",
        password: "Helloworld#1",
        name: "foo",
      });
      return { address: db.address, port: db.port };
    });
    assert.isDefined(result.outputs["address"].value)
    assert.isDefined(result.outputs["port"].value)
  });
});
