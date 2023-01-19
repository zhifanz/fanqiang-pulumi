import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "node:path";
import fs from "node:fs/promises";
import _ from "lodash";
import { BucketOperations } from "../aws/BucketOperations";
import { CloudServer } from "../alicloud/CloudServer";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import * as cloudconfig from "../cloudinit/cloudconfig";
import { ShadowsocksProperties } from "../proxy/shadowsocks";
import { Ansible } from "../Ansible";
import * as awsUtils from "../aws/utils";
import { Host } from "../domain";

type DatabaseProps = { user: string; password: string; name: string };

type RunbookExtraVars = {
  proxy: {
    props: ShadowsocksProperties;
    hosts: {
      default: string;
      extra?: Record<string, string>;
    };
  };
  database: DatabaseProps & {
    host: string;
    port: number;
  };
  link: { domestic: string; extra?: Record<string, string> };
};

export class ClashRouter extends pulumi.ComponentResource implements Host {
  readonly ipAddress: pulumi.Output<string>;
  constructor(
    ansible: Ansible,
    bucket: BucketOperations,
    proxyInfra: {
      props: ShadowsocksProperties;
      hosts: {
        default: pulumi.Input<string>;
        extra?: Record<string, pulumi.Input<string>>;
      };
    },
    databaseProps: DatabaseProps,
    ...publicKeys: string[]
  ) {
    super("fanqiang:alicloud:ClashRouter", DEFAULT_RESOURCE_NAME);
    const server = new CloudServer(
      { clash: proxyInfra.props.port, ssh: 22 },
      {
        userData: cloudconfig.withSshAuthorizedKeys([
          ansible.publicKey,
          ...publicKeys,
        ]),
        parent: this,
      }
    );
    const database = new aws.lightsail.Database(
      "postgres",
      {
        availabilityZone: pulumi.concat(awsUtils.getRegion(), "a"),
        blueprintId: "postgres_12",
        bundleId: "micro_1_0",
        masterDatabaseName: databaseProps.name,
        masterPassword: databaseProps.password,
        masterUsername: databaseProps.user,
        relationalDatabaseName: "postgres",
        applyImmediately: true,
        publiclyAccessible: true,
        skipFinalSnapshot: true,
      },
      { parent: this }
    );
    let runbookExtraVars: pulumi.Output<RunbookExtraVars> = pulumi
      .all([
        proxyInfra.hosts.default,
        database.masterEndpointAddress,
        database.masterEndpointPort,
        this.prepareRuleLinks(bucket, "domestic"),
      ])
      .apply(([proxy, db, port, domestic]) => ({
        proxy: {
          props: proxyInfra.props,
          hosts: { default: proxy },
        },
        database: { host: db, port, ...databaseProps },
        link: { domestic },
      }));

    if (proxyInfra.hosts.extra) {
      runbookExtraVars = pulumi
        .all([
          runbookExtraVars,
          pulumi.all(proxyInfra.hosts.extra),
          pulumi.all(
            _.mapValues(proxyInfra.hosts.extra, (v, k, o) =>
              this.prepareRuleLinks(bucket, k)
            )
          ),
        ])
        .apply(([vars, extra, links]) => ({
          proxy: {
            props: vars.proxy.props,
            hosts: { default: vars.proxy.hosts.default, extra },
          },
          database: vars.database,
          link: { domestic: vars.link.domestic, extra: links },
        }));
    }
    ansible.provisionInstance(
      "provision-clash-router",
      [server.ipAddress],
      path.join(__dirname, "playbook.yml"),
      {
        remoteUser: "root",
        extraVars: runbookExtraVars.apply(JSON.stringify),
        parent: this,
        dependsOn: [server, database],
      }
    );

    this.ipAddress = server.ipAddress;
  }

  private prepareRuleLinks(
    bucket: BucketOperations,
    name: string
  ): pulumi.Output<string> {
    const result = bucket.uploadContent(
      `clash/rules/${name}-domains.yml`,
      fs.readFile(path.join(__dirname, "domains.yml"), "utf8"),
      {
        parent: this,
        publicRead: true,
      }
    );
    return bucket.getUrl(result.key);
  }
}
