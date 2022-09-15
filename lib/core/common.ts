import { BucketOperations } from "./aws/BucketOperations";

export interface SharedResources {
  readonly bucket: BucketOperations;
}

export function createSharedResources(bucketName: string): SharedResources {
  return { bucket: new BucketOperations(bucketName) };
}
