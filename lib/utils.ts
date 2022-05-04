import { CustomResource, Input, output, Output } from "@pulumi/pulumi";
import { PathLike } from "fs";
import { readFile } from "fs/promises";
import _ from "lodash";
import * as path from "path";

export function defaultResource<
  T extends CustomResource,
  TC extends new (...args: any[]) => T
>(resourceConstructor: TC, args: ConstructorParameters<TC>[1]): T {
  return new resourceConstructor("default", args);
}
