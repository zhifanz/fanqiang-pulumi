import * as pulumi from "@pulumi/pulumi";
import {
  CloudObjectPath,
  Configuration,
  ProxyConnectionProperties,
} from "./Configuration";
import { Host } from "./Host";
import * as crypto from "node:crypto";
import { AnalyzerConstructFunction, SshParams } from "./RuleAnalyzer";

export function generateVpnConfig(
  configuration: Configuration
): pulumi.Output<string> {
  let clientConfig: pulumi.Output<string>;
  const keyPair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const defaultProxy = configuration.proxyServerFactory(configuration, {
    publicKeys: [keyPair.publicKey],
  });
  clientConfig = configuration.vpnClientConfigurationTemplate.basic({
    ...configuration,
    ...defaultProxy,
  });
  if (configuration.intermediate) {
    let intermediateHost: Host;
    if (configuration.intermediate instanceof Function) {
      intermediateHost = configuration.intermediate(
        defaultProxy,
        configuration.port
      );
      clientConfig = configuration.vpnClientConfigurationTemplate.basic({
        ...configuration,
        ...intermediateHost,
      });
    } else {
      const hosts: any = {
        defaultProxy: {
          ...defaultProxy,
          ...configuration,
          privateKey: keyPair.privateKey,
        },
      };
      if (configuration.intermediate.additionalProxyRegions) {
        hosts.additionalProxies = {} as Record<
          string,
          ProxyConnectionProperties & SshParams
        >;
        for (const region of configuration.intermediate
          .additionalProxyRegions) {
          hosts.additionalProxies[region] = {
            ...configuration.proxyServerFactory(configuration, {
              region,
              publicKeys: [keyPair.publicKey],
            }),
            ...configuration,
            privateKey: keyPair.privateKey,
          };
        }
      }
      const repo = configuration.intermediate.createEventRepo();
      const router = configuration.intermediate.routerFactory(
        hosts.defaultProxy,
        configuration.port,
        {
          additionalProxies: hosts.additionalProxies,
          fluentbitOutput: repo.fluentbitOutput,
          publicKeys: [keyPair.publicKey],
        }
      );
      configuration.intermediate.createAnalyzer(repo, {
        defaultProxy: hosts.defaultProxy,
        domestic: {
          ipAddress: router.ipAddress,
          privateKey: keyPair.privateKey,
          ipRule: router.ipRule.domestic,
        },
        additionalProxies: mergeProxies(
          hosts.additionalProxies,
          router.ipRule.additionalProxies
        ),
      });
      clientConfig = configuration.vpnClientConfigurationTemplate.rules({
        ipAddress: router.ipAddress,
        port: configuration.port,
      });
    }
  }
  return clientConfig;
}

function mergeProxies(
  sshConfig?: Record<string, SshParams>,
  ruleConfig?: Record<string, CloudObjectPath>
) {
  if (!sshConfig || !ruleConfig) {
    return undefined;
  }
  const result: Parameters<AnalyzerConstructFunction>[1]["additionalProxies"] =
    {};
  for (const k in sshConfig) {
    result[k] = { ...sshConfig[k], ipRule: ruleConfig[k] };
  }
  return result;
}
