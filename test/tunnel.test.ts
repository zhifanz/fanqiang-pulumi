import * as pulumi from "@pulumi/pulumi";
import { AlicloudEcsNginxTunnelConstructor } from "../lib/core/tunnel/AlicloudEcsNginxTunnelConstructor";
import { AlicloudEcsClashRouterConstructor } from "../lib/core/tunnel/AlicloudEcsClashTunnelConstructor";
import { createSharedResources } from "../lib/core/common";
import { applyProgram, assertConnectSuccess } from "./helper";

describe("tunnel", function () {
  it("apply nginx tunnel", async function () {
    const result = await applyProgram(async () => {
      const component = new AlicloudEcsNginxTunnelConstructor(
        { host: pulumi.output("0.0.0.0"), port: pulumi.output(8388) },
        "50",
        "1"
      );
      return component.apply();
    });
    const ip = result.outputs["publicIpAddress"].value;
    await assertConnectSuccess(ip, 8388);
  });

  it("apply clash tunnel", async function () {
    const result = await applyProgram(async () => {
      const sharedResources = createSharedResources("fanqiang-test");
      const component = new AlicloudEcsClashRouterConstructor(
        {
          host: pulumi.output("0.0.0.0"),
          port: pulumi.output(8388),
          encryption: pulumi.output("aes-256-gcm"),
          password: pulumi.output("foo"),
        },
        sharedResources.bucket,
        "50",
        "1",
        process.env["PUBLIC_KEY"]
      );
      return component.apply();
    });
    const ip = result.outputs["publicIpAddress"].value;
    await assertConnectSuccess(ip, 7890);
  });
});
