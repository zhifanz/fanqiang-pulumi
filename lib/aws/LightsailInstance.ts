import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { Host } from "../domain";
import { getRegion } from "./utils";

type InitData = { keyPair: aws.lightsail.KeyPair };

export class LightsailInstance
  extends pulumi.ComponentResource<InitData>
  implements Host
{
  private readonly instance: aws.lightsail.Instance;
  constructor(
    name: string,
    ports: number[],
    keyPair: aws.lightsail.KeyPair,
    opts?: { parent?: pulumi.Resource; provider?: aws.Provider }
  ) {
    super("fanqiang:aws:LightsailInstance", name, undefined, {
      providers: opts?.provider && { aws: opts.provider },
      parent: opts?.parent,
    });
    this.instance = new aws.lightsail.Instance(
      `${name}-instance`,
      {
        availabilityZone: pulumi.concat(
          opts?.provider ? opts.provider.region : getRegion(),
          "a"
        ),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_2_0",
        keyPairName: keyPair.name,
      },
      { parent: this, provider: opts?.provider }
    );
    new aws.lightsail.InstancePublicPorts(
      `${name}-ports`,
      {
        instanceName: this.instance.name,
        portInfos: ports.map((p) => ({
          protocol: "tcp",
          fromPort: p,
          toPort: p,
          cidrs: ["0.0.0.0/0"],
        })),
      },
      { parent: this, provider: opts?.provider }
    );
  }

  get ipAddress(): pulumi.Output<string> {
    return this.instance.publicIpAddress;
  }
}
