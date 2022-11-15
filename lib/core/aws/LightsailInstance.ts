import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { ProxyRegion } from "../../domain/Configuration";
import { Host } from "../../domain/Host";
import {
  InstanceProvision,
  ProvisionInstanceFunction,
} from "../InstanceProvision";
import { getRegion } from "./utils";

export class LightsailInstance
  extends pulumi.ComponentResource
  implements Host
{
  readonly ipAddress: pulumi.Output<string>;
  constructor(
    name: string,
    ports: number[],
    opts?: {
      privisionInstance?: ProvisionInstanceFunction;
      region?: ProxyRegion;
    }
  ) {
    super(
      "fanqiang:aws:LightsailInstance",
      name,
      undefined,
      opts?.region
        ? {
            providers: {
              aws: new aws.Provider(opts.region, { region: opts.region }),
            },
          }
        : undefined
    );

    const instance = new aws.lightsail.Instance(
      name,
      {
        availabilityZone: pulumi.concat(opts?.region || getRegion(), "a"),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_2_0",
        userData: getUserData(opts?.privisionInstance),
      },
      { parent: this }
    );
    new aws.lightsail.InstancePublicPorts(
      name,
      {
        instanceName: instance.name,
        portInfos: ports.map((p) => ({
          protocol: "tcp",
          fromPort: p,
          toPort: p,
          cidrs: ["0.0.0.0/0"],
        })),
      },
      { parent: this }
    );
    this.ipAddress = instance.publicIpAddress;
    this.registerOutputs();
  }
}

function getUserData(
  privisionInstance?: ProvisionInstanceFunction
): pulumi.Output<string> | string | undefined {
  if (privisionInstance) {
    const instanceProvision = new InstanceProvision(false);
    privisionInstance(instanceProvision);
    return instanceProvision.toShellScript() || undefined;
  }
}
