import * as pulumi from "@pulumi/pulumi";
import * as crypto from "node:crypto";
import { BucketOperations } from "./aws/BucketOperations";
import { Encryption, ShadowsocksProperties } from "./proxy/ShadowsocksServer";
import { AbstractHandler, Context, Minimal, Moderate } from "./handlers";

async function loadContext(): Promise<Context & { scale: string }> {
  const stackConfig = new pulumi.Config();
  const bucketOperations = new BucketOperations(stackConfig.require("bucket"));
  const ssprops: ShadowsocksProperties = {
    encryption: stackConfig.require<Encryption>("encryption"),
    password:
      stackConfig.get("password") || crypto.randomBytes(8).toString("base64"),
    port: stackConfig.requireNumber("port"),
  };
  return {
    bucketOperations,
    ssprops,
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
    default:
      throw new Error("Unsupported scale: " + context.scale);
  }
  return handler.process(context);
}
