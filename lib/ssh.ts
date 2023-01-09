import * as fs from "node:fs";
import * as path from "node:path";
import * as cp from "node:child_process";

export type GetKeyPairFunc = () => KeyPair;

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
  static generateKeyPair(dir: string): KeyPair {
    cp.execFileSync(
      "ssh-keygen",
      ["-t", "ed25519", "-C", "bot@fanqiang", "-N", "", "-f", this.FILE_NAME],
      { encoding: "utf-8", cwd: dir }
    );
    cp.execFileSync("chmod", ["0600", this.FILE_NAME], {
      encoding: "utf-8",
      cwd: dir,
    });
    const keyFile = path.join(dir, this.FILE_NAME);
    return new KeyPair(keyFile);
  }
}

export class KeyPairHolder {
  private keyPair: KeyPair | undefined;
  constructor(readonly dir: string) {}

  get: GetKeyPairFunc = () => {
    if (!this.keyPair) {
      this.keyPair = SshOperations.generateKeyPair(this.dir);
    }
    return this.keyPair;
  };
}
