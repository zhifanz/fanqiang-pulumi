import { CustomResource } from "@pulumi/pulumi";

export default function defaultResource<
  T extends CustomResource,
  TC extends new (...args: any[]) => T
>(resourceConstructor: TC, args: ConstructorParameters<TC>[1]): T {
  return new resourceConstructor("default", args);
}
