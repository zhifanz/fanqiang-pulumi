import { AwsEc2Instance } from "../aws/AwsEc2Instance";
import { BucketOperations } from "../aws/BucketOperations";
import { render } from "../jinja/templates";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  VpnServer,
  s3ClientConfigurations,
  VpnClientConfigurations,
  S3_CONFIG_PATH,
} from "./VpnServer";

export class AwsEc2LibreswanVpnServer
  extends AwsEc2Instance
  implements VpnServer
{
  constructor(private readonly bucket: BucketOperations) {
    super(
      "libreswan",
      pulumi.output(determineAmi()).imageId,
      render("libreswan-cloud-init.j2", {
        shebang: true,
        cwd: "/root",
        bucket: bucket.bucketName,
        ...S3_CONFIG_PATH,
      })
    );
  }

  get clientConfigurations(): VpnClientConfigurations {
    return s3ClientConfigurations(this.bucket);
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
