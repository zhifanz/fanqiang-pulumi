import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Ansible } from "../Ansible";
import * as _ from "lodash";
import { LightsailInstance } from "../aws/LightsailInstance";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import { Host } from "../../domain/Configuration";

export type Encryption =
  | "plain"
  | "aes-128-gcm"
  | "aes-256-gcm"
  | "chacha20-ietf-poly1305";

export type ShadowsocksProperties = {
  encryption: Encryption;
  password: string;
  port: number;
};

export class ShadowsocksServer
  extends pulumi.ComponentResource
  implements Host
{
  private readonly instance: LightsailInstance;
  constructor(
    props: ShadowsocksProperties,
    ansible: Ansible,
    ...publicKeys: string[]
  ) {
    super("fanqiang:aws:ShadowsocksServer", DEFAULT_RESOURCE_NAME);
    this.instance = new LightsailInstance(
      "ssserver-default",
      [22, props.port],
      new aws.lightsail.KeyPair(
        "ansible",
        { publicKey: ansible.publicKey },
        { parent: this }
      ),
      { parent: this }
    );

    ansible.provisionInstance(
      "provisionShadowsocksServer",
      [this.instance.ipAddress],
      path.join(__dirname, "playbook.yml"),
      {
        remoteUser: "ec2-user",
        extraVars: JSON.stringify({
          ..._.omit(props, "port"),
          servicePort: props.port,
          publicKeys: publicKeys,
        }),
        parent: this,
        dependsOn: [this.instance],
      }
    );
  }
  get ipAddress(): pulumi.Output<string> {
    return this.instance.ipAddress;
  }
}
