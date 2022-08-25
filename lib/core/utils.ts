import { CustomResource, Input, output, Output } from "@pulumi/pulumi";
import { readFileSync } from "fs";
import _ from "lodash";
import * as path from "path";
import yaml from "js-yaml";
import { PulumiFn } from "@pulumi/pulumi/automation";

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
