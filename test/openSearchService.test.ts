import { assert } from "chai";
import { createOpenSearchService } from "../lib/core/tunnel/openSearchService";
import { basicAuthentication } from "../lib/core/utils";
import { applyProgram } from "./helper";

describe("openSearchService", function () {
  it("create opensearch service", async function () {
    const result = await applyProgram(() => {
      return Promise.resolve(createOpenSearchService("fanqiang-foo", "bar"));
    });
    const username = result.outputs["username"].value;
    const password = result.outputs["password"].value;
    const endpoint = result.outputs["endpoint"].value;
    const indexSettings = await (
      await fetch(`https://${endpoint}/bar`, {
        headers: {
          Authorization: "Basic " + basicAuthentication(username, password),
        },
      })
    ).json();
    assert(indexSettings);
  });
});
