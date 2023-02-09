import { ClashLogDatabase } from "../../lib/router/ClashLogDatabase";
import { pulumiit } from "../helper";
import { assert } from "chai";

describe("ClashLogDatabase", () => {
  pulumiit(
    "ddl script execute successfully",
    async function () {
      const db = new ClashLogDatabase({
        user: "test",
        password: "Helloworld#1",
        name: "foo",
      });
      return { address: db.address, port: db.port };
    },
    (result) => {
      assert.isDefined(result.address);
      assert.isDefined(result.port);
    }
  );
});
