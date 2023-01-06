import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "node:path";
import { DEFAULT_RESOURCE_NAME } from "../utils";

type Options = { parent?: pulumi.Resource; publicRead?: boolean };

export class BucketOperations {
  private readonly bucket: aws.s3.Bucket;
  constructor(readonly bucketName: string) {
    this.bucket = new aws.s3.Bucket(DEFAULT_RESOURCE_NAME, {
      forceDestroy: true,
      bucket: bucketName,
    });
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
      options
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
      options
    );
  }

  private upload(
    key: string,
    extendArgs: (basicArgs: aws.s3.BucketObjectArgs) => void,
    opts?: Options
  ): aws.s3.BucketObject {
    const args: aws.s3.BucketObjectArgs = {
      bucket: this.bucket.id,
      key,
      forceDestroy: true,
    };
    if (opts?.publicRead) {
      args.acl = "public-read";
    }
    extendArgs(args);
    return new aws.s3.BucketObject(path.basename(key), args, {
      parent: opts?.parent,
    });
  }
}
