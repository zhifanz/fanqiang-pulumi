import * as pulumi from "@pulumi/pulumi";

export type Host = {
  ipAddress: pulumi.Output<string>;
  ipv6Address: pulumi.Output<string>;
};
export type ServiceEndpoint = Host & {
  port: number;
};
