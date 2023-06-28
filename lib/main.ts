import * as pulumi from "@pulumi/pulumi";
import { BucketOperations } from "./aws/BucketOperations";
import { Ansible } from "./Ansible";
import { Encryption, ShadowsocksProperties } from "./proxy/ShadowsocksServer";
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
  const ansible = await Ansible.create();
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
    ansible,
    bucketOperations,
    ssprops,
    publicKeys,
    scale: stackConfig.require("scale"),
  };
}

export async function apply() {
  const context = await loadContext();
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
}
