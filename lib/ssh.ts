import * as fs from "node:fs";
import * as path from "node:path";
import * as cp from "node:child_process";
import * as util from "node:util";

export type GetKeyPairFunc = () => Promise<KeyPair>;

export class KeyPair {
  constructor(readonly privateKeyFile: string) {}

  get publicKeyFile(): string {
    return this.privateKeyFile + ".pub";
  }

  get publicKey(): string {
    return fs.readFileSync(this.publicKeyFile, "utf-8");
  }

  get privateKey(): string {
    return fs.readFileSync(this.privateKeyFile, "utf-8");
  }
}

export class SshOperations {
  static readonly FILE_NAME = "id_ed25519.fanqiang";
  static async generateKeyPair(dir: string): Promise<KeyPair> {
    const execCommand = (command: string) =>
      util.promisify(cp.exec)(command, { encoding: "utf-8", cwd: dir });
    await execCommand(
      `ssh-keygen -t ed25519 -C bot@fanqiang -N '' -f ${this.FILE_NAME}`
    );
    await execCommand(`chmod 0600 ${this.FILE_NAME}`);
    const keyFile = path.join(dir, this.FILE_NAME);
    return new KeyPair(keyFile);
  }
}

export class KeyPairHolder {
  private keyPair: KeyPair | undefined;
  constructor(readonly dir: string) {}

  get: GetKeyPairFunc = async () => {
    if (!this.keyPair) {
      this.keyPair = await SshOperations.generateKeyPair(this.dir);
    }
    return this.keyPair;
  };
}
