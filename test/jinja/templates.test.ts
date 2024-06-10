import { assert } from "chai";
import { render } from "../../lib/jinja/templates";
import { S3_CONFIG_PATH } from "../../lib/proxy/VpnServer";

describe("templates", () => {
  it("render", () => {
    const result = render("libreswan-cloud-init.j2", {
      cwd: "/root",
      bucket: "fanqiang",
      ...S3_CONFIG_PATH,
    });
    assert.isFalse(result.includes("\r"));
  });
});
