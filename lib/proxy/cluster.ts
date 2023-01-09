import * as aws from "@pulumi/aws";
import * as path from "node:path";
import _ from "lodash";
import { Ansible } from "../Ansible";
import { LightsailInstance } from "../aws/LightsailInstance";
import { ShadowsocksProperties } from "./shadowsocks";

export class ProxyCluster {
  readonly default: LightsailInstance;
  readonly extra: Record<string, LightsailInstance> = {};
  constructor(
    props: ShadowsocksProperties,
    ansible: Ansible,
    extraRegions: aws.Region[],
    ...publicKeys: string[]
  ) {
    const ports = [22, props.port];
    this.default = new LightsailInstance("ssserver-default", ports, {
      name: "fanqiang",
      publicKey: ansible.publicKey,
    });
    extraRegions.forEach((region) => {
      const provider = new aws.Provider(region, { region });
      this.extra[extractContinent(region)] = new LightsailInstance(
        `ssserver-${region}`,
        ports,
        { name: `fanqiang-${region}`, publicKey: ansible.publicKey },
        { provider }
      );
    });

    ansible.provisionInstance(
      "provisionSsserverCluster",
      this.instances.map((e) => e.ipAddress),
      path.join(__dirname, "playbook.yml"),
      {
        remoteUser: "ec2-user",
        extraVars: JSON.stringify({
          ..._.omit(props, "port"),
          servicePort: props.port,
          publicKeys,
        }),
        dependsOn: this.instances,
      }
    );
  }

  get instances(): LightsailInstance[] {
    return [this.default, ...Object.values(this.extra)];
  }
}

function extractContinent(region: string): string {
  return region.substring(0, region.indexOf("-"));
}
