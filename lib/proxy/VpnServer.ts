import { BucketOperations } from "../aws/BucketOperations";
import * as pulumi from "@pulumi/pulumi";

export const S3_CONFIG_PATH = {
  Apple: "vpn/client.mobileconfig",
  Android: "vpn/client.sswan",
  Windows: "vpn/client.zip",
};
export type VpnClientConfigurations = Record<
  keyof typeof S3_CONFIG_PATH,
  pulumi.Output<string>
>;

export interface VpnServer {
  clientConfigurations: VpnClientConfigurations;
}

export function s3ClientConfigurations(bucket: BucketOperations) {
  return {
    Apple: bucket.getUrl(S3_CONFIG_PATH.Apple),
    Android: bucket.getUrl(S3_CONFIG_PATH.Android),
    Windows: bucket.getUrl(S3_CONFIG_PATH.Windows),
  };
}
