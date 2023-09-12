import { pulumiit } from "../helper";
import { AwsEc2Instance } from "../../lib/aws/AwsEc2Instance";
import { assert } from "chai";
import * as aws from "@pulumi/aws";

describe("AwsEc2Instance", () => {
  pulumiit(
    "create spot ec2 instance",
    async () => {
      const foo = new AwsEc2Instance("foo", "ami-0f409bae3775dc8e5");
      return { ipv4: foo.ipAddress, ipv6: foo.ipv6Address };
    },
    (result) => {
      assert.ok(result.ipv4);
      assert.ok(result.ipv6);
    }
  );
  pulumiit(
    "ami is available",
    async () => {
      return {
        images: aws.ec2.getAmiOutput({
          mostRecent: true,
          filters: [{ name: "image-id", values: ["ami-0f0f7b386be96ec2d"] }],
        }),
      };
    },
    (result) => {
      assert.ok(result.images.description.includes("Amazon Linux 2 Kernel"));
    }
  );
});
