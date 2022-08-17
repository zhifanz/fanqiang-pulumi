import * as pulumi from "@pulumi/pulumi";

export type ServiceEndpoints = {
  host: pulumi.Output<string>;
  port: pulumi.Output<number>;
};
