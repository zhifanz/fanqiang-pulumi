import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import * as aws from "@pulumi/aws";
import * as path from "node:path";
import { AlicloudEcsTunnelConstructor } from "./AlicloudEcsTunnelConstructor";
import { Router, RouterFactory } from "../../domain/Router";
import { ProxyServer } from "../../domain/ProxyServer";
import { createOpenSearchService } from "./openSearchService";
import { interpolate } from "@pulumi/pulumi";

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
  private readonly files: aws.s3.BucketObject[];
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
    this.files = [];
  }

  private createBucketObject(
    name: string,
    file: string | pulumi.Output<string>
  ): aws.s3.BucketObject {
    const args: aws.s3.BucketObjectArgs = {
      bucket: this.bucket.id,
      key: "tunnel/" + name,
      forceDestroy: true,
    };
    if (typeof file == "string") {
      args.source = new pulumi.asset.FileAsset(file);
    } else {
      args.content = file;
    }
    return new aws.s3.BucketObject(name, args);
  }

  apply(): { publicIpAddress: pulumi.Output<string> } {
    const opensearch = createOpenSearchService(
      "fanqiang",
      "internet-access-events"
    );
    new aws.iam.UserPolicy("defaultAgent", {
      user: this.agentUser.name,
      policy: pulumi.all([this.bucket.arn]).apply(([bucketArn]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "s3:*",
              Resource: [bucketArn + "/*", bucketArn],
            },
          ],
        })
      ),
    });
    this.files.push(
      this.createBucketObject(
        "fluent-bit.conf",
        this.fluentbitConf(
          opensearch.endpoint,
          "internet-access-events",
          opensearch.username,
          opensearch.password
        )
      )
    );
    this.files.push(
      this.createBucketObject(
        "fluent-bit-parsers.conf",
        path.join(__dirname, "fluent-bit-parsers.conf")
      )
    );
    this.files.push(this.createBucketObject("config.yaml", this.clashConf()));
    this.files.push(
      this.createBucketObject(
        "docker-compose.yml",
        path.join(__dirname, "docker-compose.yml")
      )
    );

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
mkdir -p $CLASH_HOME
${this.copyCommand(this.files[0].key)}
${this.copyCommand(this.files[1].key)}
${this.copyCommand(this.files[2].key)}
${this.copyCommand(this.files[3].key)}
docker compose --project-directory $CLASH_HOME up --no-start
docker compose --project-directory $CLASH_HOME start fluentbit
docker compose --project-directory $CLASH_HOME start clash
`;
  }

  private copyCommand(key: pulumi.Input<string>): pulumi.Output<string> {
    return pulumi.interpolate`aws s3 cp s3://${this.bucket.id}/${key} $CLASH_HOME/$(basename ${key})`;
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
  fluentbitConf(
    host: pulumi.Input<string>,
    index: pulumi.Input<string>,
    username: pulumi.Input<string>,
    password: pulumi.Input<string>
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
    Name opensearch
    Match *
    Host ${host}
    Port 443
    HTTP_User ${username}
    HTTP_Passwd ${password}
    AWS_Region ${getRegion()}
    Index ${index}
    tls On
`;
  }
}

function getRegion(): pulumi.Output<string> {
  return pulumi.output(aws.getRegion()).apply((r) => r.id);
}
