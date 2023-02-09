import * as pulumi from "@pulumi/pulumi";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

import { KeyPairHolder } from "./ssh";
import { BucketOperations } from "./aws/BucketOperations";
import { Ansible } from "./Ansible";
import { Encryption, ShadowsocksProperties } from "./proxy/shadowsocks";
import _ from "lodash";
import {
  AbstractHandler,
  Context,
  Minimal,
  Moderate,
  Premium,
  Ultimate,
} from "./handlers";

async function loadContext(): Promise<Context & { scale: string }> {
  const stackConfig = new pulumi.Config();
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new KeyPairHolder(tmpdir);
  const ansible = await Ansible.create(keyPairHolder.get);
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password: stackConfig.require("password"),
    port: stackConfig.requireNumber("port"),
  };
  let publicKeys: string[] = [];
  if (stackConfig.get("publicKeys")) {
    publicKeys = stackConfig.require("publicKeys").split(",");
  }
  return {
    tmpdir,
    ansible,
    bucketOperations,
    ssprops,
    publicKeys,
    scale: stackConfig.require("scale"),
  };
}

export async function apply() {
  const context = await loadContext();
  try {
    let handler: AbstractHandler;
    switch (context.scale) {
      case "minimal":
        handler = new Minimal();
        break;
      case "moderate":
        handler = new Moderate();
        break;
      case "premium":
        handler = new Premium();
        break;
      case "ultimate":
        handler = new Ultimate();
        break;
      default:
        throw new Error("Unsupported scale: " + context.scale);
    }
    return handler.process(context);
  } finally {
    await fs.rm(context.tmpdir, { recursive: true });
  }
}
