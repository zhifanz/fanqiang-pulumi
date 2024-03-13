import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "node:path";
import { DEFAULT_RESOURCE_NAME } from "../utils";

const defaultRegionProvider = {
  provider: new aws.Provider("defaultRegion", {
    region: "us-east-1",
  }),
};

export class BucketOperations {
  private readonly bucket: aws.s3.BucketV2;
  constructor(readonly bucketName: string) {
    this.bucket = new aws.s3.BucketV2(
      DEFAULT_RESOURCE_NAME,
      {
        forceDestroy: true,
        bucket: bucketName,
      },
      defaultRegionProvider
    );
    new aws.s3.BucketPolicy(
      DEFAULT_RESOURCE_NAME,
      {
        bucket: this.bucket.id,
        policy: this.bucket.arn.apply((arn) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [`${arn}/*`],
              },
            ],
          })
        ),
      },
      {
        dependsOn: new aws.s3.BucketPublicAccessBlock(
          DEFAULT_RESOURCE_NAME,
          {
            bucket: this.bucket.id,
          },
          defaultRegionProvider
        ),
        ...defaultRegionProvider,
      }
    );
  }

  getUri(path: string): string {
    return `s3://${this.bucketName}/${path}`;
  }

  getUrl(path: pulumi.Input<string>): pulumi.Output<string> {
    return pulumi.interpolate`https://${this.bucketDomainName}/${path}`;
  }

  get bucketDomainName(): pulumi.Output<string> {
    return this.bucket.bucketDomainName;
  }

  get bucketArn(): pulumi.Output<string> {
    return this.bucket.arn;
  }

  uploadContent(
    key: string,
    content: pulumi.Input<string>,
    parent?: pulumi.Resource
  ): aws.s3.BucketObject {
    return new aws.s3.BucketObject(
      path.basename(key),
      {
        bucket: this.bucket.id,
        key,
        content,
      },
      { ...defaultRegionProvider, parent }
    );
  }
}
