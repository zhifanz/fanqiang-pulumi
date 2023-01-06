import _ from "lodash";
import * as path from "path";
import * as net from "node:net";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import promiseRetry from "promise-retry";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as crypto from "node:crypto";
import { CustomResource } from "@pulumi/pulumi";

export const DEFAULT_RESOURCE_NAME = "default";
export const PULUMI_PROJECT_NAME = loadPulumiProjectConfiguration().name;

function loadPulumiProjectConfiguration(): { name: string } {
  return <any>(
    yaml.load(
      readFileSync(path.resolve(__dirname, "../../Pulumi.yaml"), "utf8")
    )
  );
}

export function defaultResource<
  T extends CustomResource,
  TC extends new (...args: any[]) => T
>(resourceConstructor: TC, args: ConstructorParameters<TC>[1]): T {
  return new resourceConstructor("default", args);
}

export function basicAuthentication(
  username: string,
  password: string
): string {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

export async function tryConnect(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, host);
    client.on("connect", () => {
      resolve();
      client.removeAllListeners().destroy();
    });
    client.on("error", (err: Error) => {
      reject(err);
      client.removeAllListeners().destroy();
    });
  });
}

export async function waitConnectSuccess(
  host: string,
  port: number,
  timeout: number
): Promise<void> {
  await promiseRetry(
    async (retry, number): Promise<void> => {
      try {
        await tryConnect(host, port);
      } catch (err) {
        retry(err);
      }
    },
    { retries: 10, maxRetryTime: timeout, minTimeout: 10 * 1000 }
  );
}

export function getAwsRegion(): pulumi.Output<string> {
  return pulumi.output(aws.getRegion()).apply((r) => r.id);
}

export function randomPassword(size: number) {
  return crypto.randomBytes(size).toString("hex");
}

export function asCloudConfig(data: any): string {
  return "#cloud-config\n\n" + yaml.dump(data);
}
