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
  readonly ipAddress: pulumi.Output<string>;
  constructor(
    name: string,
    ports: number[],
    keyPair: { name: string; publicKey: string },
    opts?: { parent?: pulumi.Resource; provider?: aws.Provider }
  ) {
    super("fanqiang:aws:LightsailInstance", name, undefined, {
      providers: opts?.provider && { aws: opts.provider },
      parent: opts?.parent,
    });
    const kp = new aws.lightsail.KeyPair(
      keyPair.name,
      { publicKey: keyPair.publicKey },
      { parent: this, provider: opts?.provider }
    );
    const instance = new aws.lightsail.Instance(
      `${name}-instance`,
      {
        availabilityZone: pulumi.concat(
          opts?.provider ? opts.provider.region : getRegion(),
          "a"
        ),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_2_0",
        keyPairName: kp.name,
      },
      { parent: this, provider: opts?.provider }
    );
    new aws.lightsail.InstancePublicPorts(
      `${name}-ports`,
      {
        instanceName: instance.name,
        portInfos: ports.map((p) => ({
          protocol: "tcp",
          fromPort: p,
          toPort: p,
          cidrs: ["0.0.0.0/0"],
        })),
      },
      { parent: this, provider: opts?.provider }
    );
    this.ipAddress = instance.publicIpAddress;
  }
}
