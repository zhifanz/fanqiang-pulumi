import { Host } from "./Host";
import * as pulumi from "@pulumi/pulumi";
import { CloudObjectPath } from "./Configuration";

export type FluentbitOutput = Record<string, pulumi.Input<string | number>>;

export interface InternetAccessEventRepository {
  readonly fluentbitOutput: FluentbitOutput;
}

export type SshParams = Host & { privateKey: string };

export type AnalyzerConstructFunction = (
  repo: InternetAccessEventRepository,
  instances: {
    defaultProxy: SshParams;
    domestic: SshParams & { ipRule: CloudObjectPath };
    additionalProxies?: Record<string, SshParams & { ipRule: CloudObjectPath }>;
  }
) => void;
