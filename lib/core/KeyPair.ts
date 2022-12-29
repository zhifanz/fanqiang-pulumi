import * as crypto from "node:crypto";

export type KeyPair = crypto.KeyPairSyncResult<string, string>;

export type KeyPairGetFunc = () => KeyPair;

export const getKeyPair: KeyPairGetFunc = function (this: {
  keyPair?: KeyPair;
}) {
  if (!this.keyPair) {
    this.keyPair = crypto.generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
  }
  return this.keyPair;
}.bind({});
