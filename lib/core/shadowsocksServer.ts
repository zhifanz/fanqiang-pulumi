import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import { ProxyProperties, ProxyRegion } from "../domain/Configuration";
import { DEFAULT_RESOURCE_NAME } from "./utils";
import { LightsailInstance } from "./aws/LightsailInstance";

export function createShadowsocksServer(
  props: ProxyProperties,
  opts?: { region?: ProxyRegion; publicKeys?: string[] }
): LightsailInstance {
  return new LightsailInstance(
    opts?.region || DEFAULT_RESOURCE_NAME,
    opts?.publicKeys?.length ? [22, props.port] : [props.port],
    {
      privisionInstance: (i) => {
        const workdir = "/var/lib/shadowsocks";
        i.ensureInternetAccess();
        i.mkdir(workdir);
        if (opts?.publicKeys?.length) {
          opts.publicKeys.forEach((pk) => i.addPublicKey(pk));
        }
        i.addCommand(scripts.installShadowsocks(props, workdir));
      },
      region: opts?.region,
    }
  );
}

const scripts = {
  installShadowsocks: (
    props: ProxyProperties,
    workdir: string
  ) => pulumi.interpolate`
SHADOWSOCKS_HOME=${workdir}
curl --location https://github.com/shadowsocks/shadowsocks-rust/releases/download/v1.11.1/shadowsocks-v1.11.1.x86_64-unknown-linux-gnu.tar.xz \
  | tar --extract --xz --file=- --directory=$SHADOWSOCKS_HOME
$SHADOWSOCKS_HOME/ssserver -s "[::]:${props.port}" -m "${props.encryption}" -k "${props.password}" -d
`,
} as const;
