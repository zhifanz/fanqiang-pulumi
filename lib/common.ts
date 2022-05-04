import * as aws from "@pulumi/aws";
import { defaultResource } from "./utils";
export function apply(bucketName: string): { bucket: aws.s3.Bucket } {
  return {
    bucket: defaultResource(aws.s3.Bucket, {
      forceDestroy: true,
      bucket: bucketName,
    }),
  };
}
