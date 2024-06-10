import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { Host } from "../domain";
import { getRegion } from "./utils";

type InitData = { keyPair: aws.lightsail.KeyPair };

export class AwsLightsail
  extends pulumi.ComponentResource<InitData>
  implements Host
{
  readonly ipAddress: pulumi.Output<string>;
  readonly ipv6Address?: pulumi.Output<string>;
  constructor(name: string, userData?: pulumi.Input<string>) {
    super("fanqiang:aws:AwsLightsail", name);
    const instance = new aws.lightsail.Instance(
      name,
      {
        availabilityZone: pulumi.concat(getRegion(), "a"),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_3_0",
        userData,
      },
      { parent: this }
    );
    new aws.lightsail.InstancePublicPorts(
      name,
      {
        instanceName: instance.name,
        portInfos: [
          {
            protocol: "all",
            fromPort: 0,
            toPort: 65535,
            cidrs: ["0.0.0.0/0"],
          },
        ],
      },
      { parent: this }
    );
    this.ipAddress = instance.publicIpAddress;
    this.ipv6Address = instance.ipv6Addresses[0];
  }
}
