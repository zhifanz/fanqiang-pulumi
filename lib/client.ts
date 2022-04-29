import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ShadowsocksConfiguration } from "./proxy";
import { readFile } from "fs/promises";
import _ from "lodash";

export type ApplyResult = { clashConfigUrl: pulumi.Output<string> };
type ShadowsocksServerConfiguration = ShadowsocksConfiguration & {
  host: string;
};

export async function apply(
  bucket: aws.s3.Bucket,
  shadowsocksConfig: pulumi.Input<ShadowsocksServerConfiguration>
): Promise<ApplyResult> {
  const templateFunc = await loadTemplate();
  const obj = new aws.s3.BucketObject("clashConfiguration", {
    bucket: bucket.id,
    key: "clash/fanqiang.yaml",
    forceDestroy: true,
    content: pulumi.output(shadowsocksConfig).apply(templateFunc),
    acl: "public-read",
  });
  return {
    clashConfigUrl: pulumi.concat(
      "https://",
      bucket.bucketDomainName,
      "/",
      obj.key
    ),
  };
}

async function loadTemplate(): Promise<_.TemplateExecutor> {
  return _.template(await readFile(__dirname + "/clash-config.tpl", "utf8"));
}
