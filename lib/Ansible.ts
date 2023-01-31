import { local } from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { GetKeyPairFunc } from "./ssh";

export class Ansible {
  constructor(readonly publicKey: string, readonly keyFile?: string) {}

  static async create(keyPairFactory: GetKeyPairFunc): Promise<Ansible> {
    let keyFile: string | undefined;
    let publicKey = await loadDefaultPublicKey();
    if (!publicKey) {
      const keyPair = await keyPairFactory();
      publicKey = await keyPair.publicKey;
      keyFile = keyPair.privateKeyFile;
    }
    return new Ansible(publicKey, keyFile);
  }

  provisionInstance(
    name: string,
    hosts: pulumi.Output<string>[],
    runbook: string,
    opts?: {
      remoteUser?: string;
      extraVars?: pulumi.Input<string>;
      parent?: pulumi.Resource;
      dependsOn?: pulumi.Resource[];
    }
  ): local.Command {
    let shellCommand: pulumi.Input<string> = "ansible-playbook";
    if (opts?.remoteUser) {
      shellCommand += ` -u ${opts.remoteUser}`;
    }
    if (this.keyFile) {
      shellCommand += ` --key-file ${this.keyFile}`;
    }
    if (opts?.extraVars) {
      shellCommand = pulumi.interpolate`${shellCommand} --extra-vars '${opts.extraVars}'`;
    }
    const concatedHosts = pulumi.all(hosts).apply((values) => values.join());
    shellCommand = pulumi.interpolate`${shellCommand} --inventory ${concatedHosts}, ${runbook}`;
    shellCommand.apply((c) =>
      pulumi.log.debug("Provisioning instances with ansible command: " + c)
    );
    return new local.Command(
      name,
      {
        create: shellCommand,
        environment: {
          ANSIBLE_HOST_KEY_CHECKING: "False",
          ANSIBLE_PYTHON_INTERPRETER: "auto_silent",
        },
      },
      { parent: opts?.parent, dependsOn: opts?.dependsOn }
    );
  }
}

async function loadDefaultPublicKey(): Promise<string | undefined> {
  const dir = path.join(os.homedir(), ".ssh");
  try {
    const pubs = (
      await fs.readdir(dir, { encoding: "utf8", withFileTypes: true })
    ).filter(
      (d) => d.isFile() && ["id_rsa.pub", "id_ed25519.pub"].includes(d.name)
    );
    if (!pubs.length) {
      return undefined;
    }
    return (await fs.readFile(path.join(dir, pubs[0].name), "utf8")).trim();
  } catch {
    return undefined;
  }
}
