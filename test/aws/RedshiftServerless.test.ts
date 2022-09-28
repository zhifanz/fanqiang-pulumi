import { applyProgram } from "../helper";
import { assert } from "chai";
import { RedshiftServerless } from "../../lib/core/aws/RedshiftServerless";
import * as pg from "pg";

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
  it("execute sql", async function () {
    const result = await applyProgram(async () => {
      const redshift = new RedshiftServerless({
        workgroupName: "default-test",
        adminUsername: "admin",
        adminUserPassword: "Iloveredshift#1",
        dbName: "fanqiang",
      });
      redshift.runSql("create table foo (c1 integer)");
      return { host: redshift.host };
    });
    const host = result.outputs["host"].value;
    assert.equal(await queryResult(host, "select count(*) from foo"), 0);
  });
});

async function queryResult(
  host: string,
  sql: string
): Promise<string | number> {
  const client = new pg.Client({
    user: "admin",
    host,
    database: "fanqiang",
    password: "Iloveredshift#1",
    port: 5439,
  });
  await client.connect();
  try {
    const rows = (await client.query({ text: sql, rowMode: "array" })).rows;
    return rows[0][0];
  } finally {
    await client.end();
  }
}
