import * as pulumi from "@pulumi/pulumi";

export type ShadowsocksConfiguration = {
  password: string;
  port: number;
  encryption: string;
};

export type ShadowsocksServerConfiguration = ShadowsocksConfiguration & {
  host: string;
};
export type TunnelConfiguration = {
  bandwidth: string;
  maxPrice: string;
  publicKey?: string;
};

export type Input<T> = { [K in keyof T]: pulumi.Input<T[K]> };
export type InfraScale = "minimal" | "moderate";
