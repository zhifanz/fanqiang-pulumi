import { assert } from "chai";
import { withSshAuthorizedKeys } from "../../lib/cloudinit/cloudconfig";
import fs from "node:fs";
import path from "node:path";

describe("CloudConfig", () => {
  it("cloud init file in correct format", () => {
    assert.equal(
      withSshAuthorizedKeys(["pk1", "pk2"]),
      fs.readFileSync(path.join(__dirname, "cloud-config.yml"), {
        encoding: "utf8",
      })
    );
  });
});
