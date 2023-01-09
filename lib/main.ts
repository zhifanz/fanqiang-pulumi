import * as pulumi from "@pulumi/pulumi";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

import { minimal, moderate, premium, ultimate, Context } from "./handlers";
import { KeyPairHolder } from "./ssh";
import { BucketOperations } from "./aws/BucketOperations";
import { Ansible } from "./Ansible";
import { Encryption, ShadowsocksProperties } from "./proxy/shadowsocks";

function loadContext(): Context & { scale: string } {
  const stackConfig = new pulumi.Config();
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fanqiang-"));
  const keyPairHolder = new KeyPairHolder(tmpdir);
  const ansible = new Ansible(keyPairHolder.get);
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

export function apply() {
  const context = loadContext();
  switch (context.scale) {
    case "minimal":
      return minimal(context);
    case "moderate":
      return moderate(context);
    case "premium":
      return premium(context);
    case "ultimate":
      return ultimate(context);
    default:
      throw new Error("Unsupported scale: " + context.scale);
  }
}
