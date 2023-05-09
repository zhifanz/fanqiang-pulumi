import * as aws from "@pulumi/aws";
import _ from "lodash";
import { AwsEcsFargate } from "../aws/AwsEcsFargate";
import { extractContinent } from "../aws/utils";

export type Encryption =
  | "plain"
  | "aes-128-gcm"
  | "aes-256-gcm"
  | "chacha20-ietf-poly1305";

export type ShadowsocksProperties = {
  encryption: Encryption;
  password: string;
  port: number;
};

export class ShadowsocksServer extends AwsEcsFargate {
  constructor(props: ShadowsocksProperties, region?: aws.Region) {
    super(
      {
        name: region
          ? `shadowsocks-${extractContinent(region)}`
          : "shadowsocks",
        image: "ghcr.io/shadowsocks/ssserver-rust:v1.15.2",
        port: props.port,
        command: [
          "ssserver",
          "--log-without-time",
          "-s",
          `[::]:${props.port}`,
          "-m",
          props.encryption,
          "-k",
          props.password,
        ],
      },
      region && { provider: new aws.Provider(region, { region }) }
    );
  }
}
