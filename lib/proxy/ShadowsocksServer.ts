import { AwsEcsFargate } from "../aws/AwsEcsFargate";

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
  constructor(props: ShadowsocksProperties) {
    super({
      name: "shadowsocks",
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
    });
  }
}
