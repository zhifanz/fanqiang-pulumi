import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "node:path";
import { DEFAULT_RESOURCE_NAME } from "../utils";

type Options = { parent?: pulumi.Resource };

export class BucketOperations {
  readonly bucket: aws.s3.Bucket;
  constructor(bucketName: string) {
    this.bucket = new aws.s3.Bucket(DEFAULT_RESOURCE_NAME, {
      forceDestroy: true,
      bucket: bucketName,
    });
  }
  get bucketName(): pulumi.Output<string> {
    return this.bucket.bucket;
  }
  get bucketArn(): pulumi.Output<string> {
    return this.bucket.arn;
  }

  uploadSource(
    key: string,
    filePath: string,
    options: Options = {}
  ): aws.s3.BucketObject {
    return this.upload(
      key,
      (args) => {
        args.source = new pulumi.asset.FileAsset(filePath);
      },
      options.parent
    );
  }

  uploadContent(
    key: string,
    content: pulumi.Input<string>,
    options: Options = {}
  ): aws.s3.BucketObject {
    return this.upload(
      key,
      (args) => {
        args.content = content;
      },
      options.parent
    );
  }

  private upload(
    key: string,
    extendArgs: (basicArgs: aws.s3.BucketObjectArgs) => void,
    parent?: pulumi.Resource
  ): aws.s3.BucketObject {
    const args: aws.s3.BucketObjectArgs = {
      bucket: this.bucket.id,
      key,
      forceDestroy: true,
    };
    extendArgs(args);
    return new aws.s3.BucketObject(path.basename(key), args, { parent });
  }
}
