import { applyProgram } from "../helper";
import { assert } from "chai";
import { RedshiftServerless } from "../../lib/core/aws/RedshiftServerless";

describe("RedshiftClashLogPersistentStrategy", function () {
  it("create redshift namespace", async function () {
    const result = await applyProgram(async () => {
      const redshift = new RedshiftServerless({
        workgroupName: "default-test",
        adminUsername: "admin",
        adminUserPassword: "Iloveredshift#1",
        dbName: "fanqiang",
      });
      return { host: redshift.host };
    });
    assert.isDefined(result.outputs["host"].value);
  });
});
