import * as aws from "@pulumi/aws";

export function apply(bucketName: string): { bucket: aws.s3.Bucket } {
  return {
    bucket: new aws.s3.Bucket("default", {
      forceDestroy: true,
      bucket: bucketName,
    }),
  };
}
