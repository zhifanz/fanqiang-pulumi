import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { ProxyServer } from "../../domain/ProxyServer";
import { DEFAULT_RESOURCE_NAME, PULUMI_PROJECT_NAME } from "../utils";

export function createLightsailShadowsocksProxy(
  encryption: string,
  password: string,
  publicKey?: string
): ProxyServer {
  return new LightsailShadowsocksProxy(
    DEFAULT_RESOURCE_NAME,
    8388,
    encryption,
    password,
    publicKey
  );
}

export class LightsailShadowsocksProxy
  extends pulumi.ComponentResource
  implements ProxyServer
{
  readonly port: pulumi.Output<number>;
  readonly host: pulumi.Output<string>;
  readonly encryption: pulumi.Output<string>;
  readonly password: pulumi.Output<string>;
  constructor(
    name: string,
    port: number,
    encryption: string,
    password: string,
    publicKey?: string
  ) {
    super(`${PULUMI_PROJECT_NAME}:proxy:LightsailShadowsocksProxy`, name);
    this.port = pulumi.output(port);
    this.encryption = pulumi.output(encryption);
    this.password = pulumi.output(password);

    const instance: aws.lightsail.Instance = new aws.lightsail.Instance(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        availabilityZone: pulumi.concat(
          pulumi.output(aws.getRegion()).name,
          "a"
        ),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_2_0",
        userData: cloudInitScript(port, encryption, password),
        keyPairName:
          publicKey &&
          new aws.lightsail.KeyPair(
            DEFAULT_RESOURCE_NAME,
            { publicKey },
            { parent: this }
          ).name,
      },
      { parent: this }
    );
    new aws.lightsail.InstancePublicPorts(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        instanceName: instance.name,
        portInfos: _.compact([port, publicKey && 22]).map((p) => ({
          protocol: "tcp",
          fromPort: p,
          toPort: p,
          cidrs: ["0.0.0.0/0"],
        })),
      },
      { parent: this }
    );
    this.host = instance.publicIpAddress;
    this.registerOutputs();
  }
}

function cloudInitScript(
  port: number,
  encryption: string,
  password: string
): pulumi.Output<string> {
  return pulumi.interpolate`
SHADOWSOCKS_HOME=/var/lib/shadowsocks
mkdir $SHADOWSOCKS_HOME
until ping -c1 github.com &>/dev/null ; do sleep 1 ; done
curl --location https://github.com/shadowsocks/shadowsocks-rust/releases/download/v1.11.1/shadowsocks-v1.11.1.x86_64-unknown-linux-gnu.tar.xz \
  | tar --extract --xz --file=- --directory=$SHADOWSOCKS_HOME
$SHADOWSOCKS_HOME/ssserver -s "[::]:${port}" -m "${encryption}" -k "${password}" -d
`;
}
