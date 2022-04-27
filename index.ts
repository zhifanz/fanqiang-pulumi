import * as pulumi from "@pulumi/pulumi";
import * as proxy from "./lib/proxy";

export = () => {
  return proxy.apply("fanqiang-dev", {
    password: "foo",
    port: 8388,
    encryption_algorithm: "aes-256-gcm",
  });
};
