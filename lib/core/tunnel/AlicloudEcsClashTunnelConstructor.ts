import project from "../../../package.json";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import * as aws from "@pulumi/aws";
import { AlicloudEcsTunnelConstructor } from "./AlicloudEcsTunnelConstructor";
import path from "path";
import { DEFAULT_RESOURCE_NAME } from "../utils";
import { Router, RouterFactory } from "../../domain/Router";
import { ProxyServer } from "../../domain/ProxyServer";

export function getRouterFactory(bucket: aws.s3.Bucket): RouterFactory {
  return (proxyServer: ProxyServer, publicKey?: string): Router => {
    const factory = new AlicloudEcsClashRouterConstructor(
      proxyServer,
      bucket,
      "100",
      "10",
      publicKey
    );
    return {
      port: factory.port,
      host: factory.apply().publicIpAddress,
      protocol: pulumi.output("socks5"),
    };
  };
}

export class AlicloudEcsClashRouterConstructor extends AlicloudEcsTunnelConstructor {
  readonly port = pulumi.output(7890);
  private readonly agentUser: aws.iam.User;
  private readonly accessKey: aws.iam.AccessKey;
  constructor(
    private readonly proxy: ProxyServer,
    private readonly bucket: aws.s3.Bucket,
    readonly bandwidth: string,
    readonly maxPrice: string,
    readonly publicKey?: string
  ) {
    super();
    this.agentUser = new aws.iam.User("defaultAgent", { forceDestroy: true });
    this.accessKey = new aws.iam.AccessKey("defaultAgent", {
      user: this.agentUser.name,
    });
  }

  apply(): { publicIpAddress: pulumi.Output<string> } {
    const logGroup = new aws.cloudwatch.LogGroup(DEFAULT_RESOURCE_NAME, {
      namePrefix: "fanqiang",
      retentionInDays: 7,
    });
    const logStream = new aws.cloudwatch.LogStream(DEFAULT_RESOURCE_NAME, {
      name: "clash",
      logGroupName: logGroup.name,
    });
    new aws.iam.UserPolicy("defaultAgent", {
      user: this.agentUser.name,
      policy: pulumi
        .all([this.bucket.arn, logGroup.arn])
        .apply(([bucket, logGroup]) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: "s3:*",
                Resource: [bucket + "/*", bucket],
              },
              {
                Effect: "Allow",
                Action: "logs:*",
                Resource: logGroup + ":*",
              },
            ],
          })
        ),
    });
    new aws.s3.BucketObject("fluentbitConf", {
      bucket: this.bucket.id,
      key: "tunnel/fluent-bit.conf",
      forceDestroy: true,
      content: fluentbitConf(logGroup.name, logStream.name),
    });
    new aws.s3.BucketObject("fluentbitParsers", {
      bucket: this.bucket.id,
      key: "tunnel/fluent-bit-parsers.conf",
      forceDestroy: true,
      source: new pulumi.asset.FileAsset(
        path.join(__dirname, "fluent-bit-parsers.conf")
      ),
    });
    new aws.s3.BucketObject("tunnelClashConfig", {
      bucket: this.bucket.id,
      key: "tunnel/config.yaml",
      forceDestroy: true,
      content: this.clashConf(),
    });
    new aws.s3.BucketObject("tunnelDockerCompose", {
      bucket: this.bucket.id,
      key: "tunnel/docker-compose.yml",
      forceDestroy: true,
      source: new pulumi.asset.FileAsset(
        path.join(__dirname, "docker-compose.yml")
      ),
    });
    return super.apply();
  }

  protected cloudInitScript(
    eip: alicloud.ecs.EipAddress
  ): pulumi.Output<string> {
    return pulumi.interpolate`${super.cloudInitScript(eip)}
mkdir ~/downloads && cd ~/downloads
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
aws configure set aws_access_key_id ${this.accessKey.id}
aws configure set aws_secret_access_key ${this.accessKey.secret}
cd ~ && rm -rf ~/downloads

yum install -y yum-utils
yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker

CLASH_HOME=/opt/clash
mkdir $CLASH_HOME && aws s3 cp s3://${
      this.bucket.id
    }/tunnel $CLASH_HOME/ --recursive
docker compose --project-directory $CLASH_HOME up --no-start
docker compose --project-directory $CLASH_HOME start fluentbit
docker compose --project-directory $CLASH_HOME start clash
`;
  }

  private clashConf(): pulumi.Output<string> {
    return pulumi.interpolate`
mixed-port: ${this.port}
allow-lan: true
bind-address: '*'
mode: rule
proxies:
  - name: auto
    type: ss
    server: ${this.proxy.host}
    port: ${this.proxy.port}
    cipher: ${this.proxy.encryption}
    password: ${this.proxy.password}
rules:
  - GEOIP,CN,DIRECT
  - MATCH,auto
`;
  }
}

function fluentbitConf(
  logGroup: pulumi.Input<string>,
  logStream: pulumi.Input<string>
): pulumi.Output<string> {
  return pulumi.interpolate`
[SERVICE]
    parsers_file /fluent-bit/etc/fluent-bit-parsers.conf

[INPUT]
    name forward

[FILTER]
    name parser
    match *
    key_name log
    parser info

[FILTER]
    name grep
    match *
    exclude log .+

[OUTPUT]
    Name cloudwatch_logs
    Match *
    region ${aws.getRegion().then((r) => r.id)}
    log_group_name ${logGroup}
    log_stream_name ${logStream}
`;
}
