import * as pulumi from "@pulumi/pulumi";

import { minimal, moderate, premium, ultimate } from "./handlers";

export function apply() {
  const stackConfig = new pulumi.Config();
  switch (stackConfig.require("scale")) {
    case "minimal":
      return minimal(stackConfig);
    case "moderate":
      return moderate(stackConfig);
    case "premium":
      return premium(stackConfig);
    case "ultimate":
      return ultimate(stackConfig);
    default:
      throw new Error("Unsupported scale: " + stackConfig.require("scale"));
  }
}
