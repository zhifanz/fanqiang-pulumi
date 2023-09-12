import { AwsEc2Instance } from "../aws/AwsEc2Instance";
import { BucketOperations } from "../aws/BucketOperations";
import { render } from "../jinja/templates";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const S3_CONFIG_PATH = {
  Apple: "vpn/client.mobileconfig",
  Android: "vpn/client.sswan",
  Windows: "vpn/client.zip",
};
type VpnClientConfigurations = Record<
  keyof typeof S3_CONFIG_PATH,
  pulumi.Output<string>
>;

export class LibreswanVpnServer extends AwsEc2Instance {
  constructor(private readonly bucket: BucketOperations) {
    super(
      "libreswan",
      pulumi.output(determineAmi()).imageId,
      render("libreswan-cloud-init.j2", {
        bucket: bucket.bucketName,
        ...S3_CONFIG_PATH,
      })
    );
  }

  get clientConfigurations(): VpnClientConfigurations {
    return {
      Apple: this.bucket.getUrl(S3_CONFIG_PATH.Apple),
      Android: this.bucket.getUrl(S3_CONFIG_PATH.Android),
      Windows: this.bucket.getUrl(S3_CONFIG_PATH.Windows),
    };
  }
}

export function determineAmi() {
  return aws.ec2.getAmi({
    filters: [
      { name: "name", values: ["amzn2-ami-kernel-5.10-hvm-*"] },
      { name: "architecture", values: ["x86_64"] },
      { name: "owner-alias", values: ["amazon"] },
      { name: "virtualization-type", values: ["hvm"] },
      { name: "root-device-type", values: ["ebs"] },
      { name: "is-public", values: ["true"] },
    ],
    mostRecent: true,
  });
}
