import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cp from "node:child_process";
import * as util from "node:util";

export type GetKeyPairFunc = () => Promise<KeyPair>;

export class KeyPair {
  constructor(readonly privateKeyFile: string) {}

  get publicKeyFile(): string {
    return this.privateKeyFile + ".pub";
  }

  get publicKey(): Promise<string> {
    return fs.readFile(this.publicKeyFile, "utf-8");
  }

  get privateKey(): Promise<string> {
    return fs.readFile(this.privateKeyFile, "utf-8");
  }
}

export class SshOperations {
  static readonly FILE_NAME = "id_ed25519.fanqiang";
  static async generateKeyPair(dir: string): Promise<KeyPair> {
    const secretFile = path.join(dir, this.FILE_NAME);
    await util.promisify(cp.exec)(
      `ssh-keygen -t ed25519 -C bot@fanqiang -N '' -f ${secretFile}`
    );
    await fs.chmod(secretFile, 0o600);
    return new KeyPair(secretFile);
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
