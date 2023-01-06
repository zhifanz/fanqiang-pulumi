import { assert } from "chai";
import { CloudServer } from "../../lib/alicloud/CloudServer";
import { asCloudConfig } from "../../lib/utils";
import { applyProgram, assertConnectSuccess } from "../helper";

describe("CloudServer", () => {
  it("return default value when parameter is undefined", function () {
    assert.equal(foo("hi"), "hi");
    assert.equal(foo(""), "");
    assert.equal(foo(), "");
    assert.equal(foo(undefined), "");
  });
  it("successfully setup public keys", async function () {
    const result = await applyProgram(async () => {
      const server = new CloudServer(
        { ssh: 22 },
        {
          userData: asCloudConfig({
            ssh_authorized_keys: [process.env["PUBLIC_KEY"]],
          }),
        }
      );
      return { host: server.ipAddress };
    });
    assertConnectSuccess(result.outputs["host"].value, 22);
  });
});

function foo(arg: string = ""): string {
  return arg;
}
