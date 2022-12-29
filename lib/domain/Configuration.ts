import * as pulumi from "@pulumi/pulumi";

export type ProxyRegion =
  | "us-east-1"
  | "us-east-2"
  | "us-west-2"
  | "ap-south-1"
  | "ap-northeast-2"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ap-northeast-1"
  | "ca-central-1"
  | "eu-central-1"
  | "eu-west-1"
  | "eu-west-2"
  | "eu-west-3"
  | "eu-north-1";

export type Host = { ipAddress: pulumi.Output<string> };
export type ServiceEndpoint = Host & {
  port: number;
};
