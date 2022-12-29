import { local } from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { KeyPairGetFunc } from "./KeyPair";

export class Ansible {
  readonly publicKey: string;
  private readonly keyFile?: string;
  constructor(getKeyPair: KeyPairGetFunc) {
    let pk = SshUtils.loadDefaultPublicKey();
    if (!pk) {
      const keyPair = getKeyPair();
      pk = keyPair.publicKey;
      this.keyFile = SshUtils.savePrivateKey(keyPair.privateKey);
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

class SshUtils {
  private static configDir(): string {
    return path.join(os.homedir(), ".ssh");
  }

  static savePrivateKey(key: string): string {
    const keyFile = path.join(this.configDir(), "id_ed25519.fangqiang.pem");
    fs.writeFileSync(keyFile, key, { encoding: "utf8" });
    return keyFile;
  }

  static loadDefaultPublicKey(): string | undefined {
    const pubs = fs
      .readdirSync(this.configDir(), { encoding: "utf8", withFileTypes: true })
      .filter(
        (d) => d.isFile() && ["id_rsa.pub", "id_ed25519.pub"].includes(d.name)
      );
    if (!pubs.length) {
      return undefined;
    }
    return fs
      .readFileSync(path.join(this.configDir(), pubs[0].name), "utf8")
      .trim();
  }
}
