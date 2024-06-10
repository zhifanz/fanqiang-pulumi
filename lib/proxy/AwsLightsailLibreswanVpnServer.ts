import { BucketOperations } from "../aws/BucketOperations";
import { render } from "../jinja/templates";
import { AwsLightsail } from "../aws/AwsLightsail";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { VpnServer, s3ClientConfigurations } from "./VpnServer";

const S3_CONFIG_PATH = {
  Apple: "vpn/client.mobileconfig",
  Android: "vpn/client.sswan",
  Windows: "vpn/client.zip",
};
type VpnClientConfigurations = Record<
  keyof typeof S3_CONFIG_PATH,
  pulumi.Output<string>
>;

export function create(bucket: BucketOperations) {
  const user = new aws.iam.User("fanqiangVpnConfigUploadUser", {
    name: "fanqiangVpnConfigUploadUser",
    path: "/fanqiang/",
  });
  new aws.iam.UserPolicy("fanqiangVpnConfigUploadUserPolicy", {
    name: "fanqiangVpnConfigUploadUserPolicy",
    user: user.name,
    policy: aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          effect: "Allow",
          actions: ["s3:*"],
          resources: [pulumi.concat(bucket.bucketArn, "/*")],
        },
      ],
    }).json,
  });
  const accessKey = new aws.iam.AccessKey(
    "fanqiangVpnConfigUploadUserAccessKey",
    {
      user: user.name,
    }
  );
  return new AwsLightsailLibreswanVpnServer(bucket, accessKey);
}

export class AwsLightsailLibreswanVpnServer
  extends AwsLightsail
  implements VpnServer
{
  constructor(
    private readonly bucket: BucketOperations,
    accessKey: aws.iam.AccessKey
  ) {
    super(
      "libreswan",
      pulumi.all([accessKey.id, accessKey.secret]).apply(([id, secret]) =>
        render("libreswan-cloud-init.j2", {
          cwd: "$HOME",
          bucket: bucket.bucketName,
          credential: { id, secret },
          ...S3_CONFIG_PATH,
        })
      )
    );
  }

  get clientConfigurations(): VpnClientConfigurations {
    return s3ClientConfigurations(this.bucket);
  }
}
