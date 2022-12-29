import * as pulumi from "@pulumi/pulumi";
import { CloudServer } from "../alicloud/CloudServer";
import { asCloudConfig, DEFAULT_RESOURCE_NAME } from "../utils";
import { Host, ServiceEndpoint } from "../../domain/Configuration";
import { Ansible } from "../Ansible";
import * as path from "node:path";

export class NginxTunnel extends pulumi.ComponentResource implements Host {
  readonly ipAddress: pulumi.Output<string>;
  constructor(
    ansible: Ansible,
    upstreamService: ServiceEndpoint,
    ...publicKeys: string[]
  ) {
    super("fanqiang:alicloud:NginxTunnel", DEFAULT_RESOURCE_NAME);
    const instance = new CloudServer(
      { ssh: 22, nginx: upstreamService.port },
      {
        userData: asCloudConfig({
          ssh_authorized_keys: [ansible.publicKey, ...publicKeys],
        }),
        parent: this,
      }
    );
    this.ipAddress = instance.ipAddress;
    ansible.provisionInstance(
      "provisionNginxTunnel",
      [this.ipAddress],
      path.join(__dirname, "playbook.yml"),
      {
        remoteUser: "root",
        extraVars: upstreamService.ipAddress.apply((ip) =>
          JSON.stringify({
            servicePort: upstreamService.port,
            remoteHost: ip,
          })
        ),
        parent: this,
        dependsOn: [instance],
      }
    );
  }
}
