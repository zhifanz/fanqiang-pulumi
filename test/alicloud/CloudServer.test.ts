import { assert } from "chai";
import { CloudServer, determineZoneId } from "../../lib/alicloud/CloudServer";
import { assertConnectSuccess, pulumiit } from "../helper";

describe("CloudServer", () => {
  it("return default value when parameter is undefined", function () {
    function foo(arg: string = ""): string {
      return arg;
    }
    assert.equal(foo("hi"), "hi");
    assert.equal(foo(""), "");
    assert.equal(foo(), "");
    assert.equal(foo(undefined), "");
  });
  pulumiit(
    "determine zone id",
    async () => ({ zoneId: determineZoneId() }),
    (result) => assert.isDefined(result.zoneId)
  );
  pulumiit(
    "successfully setup cloud server",
    async function () {
      const server = new CloudServer({ ssh: 22 });
      return { host: server.ipAddress };
    },
    (result) => assertConnectSuccess(result.host, 22)
  );
});
