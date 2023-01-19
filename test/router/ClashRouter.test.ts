import { applyProvisionProgram, assertConnectSuccess } from "../helper";
import { ClashRouter } from "../../lib/router/ClashRouter";
import { BucketOperations } from "../../lib/aws/BucketOperations";

describe("ClashRouter", function () {
  it("apply clash router", async function () {
    const result = await applyProvisionProgram(async (ansible) => {
      const host = new ClashRouter(
        ansible,
        new BucketOperations("fanqiang-test"),
        {
          hosts: {
            default: "192.168.0.1",
            extra: { ap: "192.168.0.2", eu: "192.168.0.3" },
          },
          props: {
            port: 8388,
            encryption: "aes-256-gcm",
            password: "Secret#1",
          },
        },
        { user: "guanliyuan", password: "Secret#1", name: "foo" }
      );
      return { host: host.ipAddress };
    });
    const ip = result.outputs["host"].value;
    await assertConnectSuccess(ip, 8388);
  });
});
