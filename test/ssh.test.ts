import { SshOperations } from "../lib/core/ssh"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { assert } from "chai"

describe("ssh", () => {
    it("successfully generate key pair", async () => {
        const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "fanqiang-"))
        try {
            const keyPair = SshOperations.generateKeyPair(tmpdir)
            const pub = keyPair.publicKey;
            const priv = keyPair.privateKey;
            assert.isDefined(keyPair.privateKeyFile)
            assert.isDefined(keyPair.publicKeyFile)
            assert.isTrue(pub.startsWith("ssh-ed25519"))
            assert.isTrue(priv.length > 0)
        } finally {
            await fs.rm(tmpdir, { recursive: true })
        }
    })
})