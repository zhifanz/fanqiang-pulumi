import * as aws from "@pulumi/aws";
import { DEFAULT_RESOURCE_NAME } from "./utils";

export interface SharedResources {
  readonly bucket: aws.s3.Bucket;
}

export function createSharedResources(bucketName: string): SharedResources {
  const bucket = new aws.s3.Bucket(DEFAULT_RESOURCE_NAME, {
    forceDestroy: true,
    bucket: bucketName,
  });
  return { bucket };
}
