import { local } from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { GetKeyPairFunc } from "./ssh";

export class Ansible {
  readonly publicKey: string;
  private readonly keyFile?: string;
  constructor(keyPairFactory: GetKeyPairFunc) {
    let pk = loadDefaultPublicKey()
    if (!pk) {
      const keyPair = keyPairFactory()
      pk = keyPair.publicKey
      this.keyFile = keyPair.privateKeyFile
    }
    this.publicKey = pk;
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
    shellCommand.apply((c) => console.log("Running ansible command: " + c));
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

function loadDefaultPublicKey(): string | undefined {
  const dir = path.join(os.homedir(), ".ssh")
  if (!fs.existsSync(dir)) {
    return undefined
  }
  const pubs = fs
    .readdirSync(dir, { encoding: "utf8", withFileTypes: true })
    .filter(
      (d) => d.isFile() && ["id_rsa.pub", "id_ed25519.pub"].includes(d.name)
    );
  if (!pubs.length) {
    return undefined;
  }
  return fs
    .readFileSync(path.join(dir, pubs[0].name), "utf8")
    .trim();
}


