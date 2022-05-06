import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import _ from "lodash";
import * as domain from "./domain";
import { DEFAULT_RESOURCE_NAME, PULUMI_PROJECT_NAME } from "./utils";

export class LightsailShadowsocksProxy extends pulumi.ComponentResource {
  readonly publicIpAddress: pulumi.Output<string>;
  constructor(
    name: string,
    bucket: aws.s3.Bucket,
    shadowsocksConfig: domain.ShadowsocksConfiguration
  ) {
    super(`${PULUMI_PROJECT_NAME}:proxy:LightsailShadowsocksProxy`, name);
    const artifactsPath = "proxy";
    new aws.s3.BucketObject(
      `${name}-shadowsocksConfig`,
      {
        bucket: bucket.id,
        key: artifactsPath + "/config.json",
        forceDestroy: true,
        content: shadowsocksConfigFileContent(shadowsocksConfig),
      },
      { parent: this }
    );
    new aws.s3.BucketObject(
      `${name}-shadowsocksDockerCompose`,
      {
        bucket: bucket.id,
        key: artifactsPath + "/docker-compose.yml",
        forceDestroy: true,
        source: new pulumi.asset.FileAsset(__dirname + "/docker-compose.yml"),
      },
      { parent: this }
    );
    const agentUser = new aws.iam.User(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        forceDestroy: true,
      },
      { parent: this }
    );
    new aws.iam.UserPolicy(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        user: agentUser.name,
        policy: bucket.arn.apply((arn) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: "s3:*",
                Resource: [arn + "/*", arn],
              },
            ],
          })
        ),
      },
      { parent: this }
    );
    const accessKey = new aws.iam.AccessKey(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        user: agentUser.name,
      },
      { parent: this }
    );

    const instance: aws.lightsail.Instance = new aws.lightsail.Instance(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        availabilityZone: pulumi.concat(
          pulumi.output(aws.getRegion()).name,
          "a"
        ),
        blueprintId: "amazon_linux_2",
        bundleId: "nano_2_0",
        userData: cloudInitScript(accessKey, bucket, artifactsPath),
      },
      { parent: this }
    );
    new aws.lightsail.InstancePublicPorts(
      `${name}-${DEFAULT_RESOURCE_NAME}`,
      {
        instanceName: instance.name,
        portInfos: [
          {
            protocol: "tcp",
            fromPort: shadowsocksConfig.port,
            toPort: shadowsocksConfig.port,
          },
        ],
      },
      { parent: this }
    );
    this.publicIpAddress = instance.publicIpAddress;
    this.registerOutputs();
  }
}

function shadowsocksConfigFileContent(
  config: domain.ShadowsocksConfiguration
): string {
  return JSON.stringify({
    server: "::",
    server_port: config.port,
    password: config.password,
    method: config.encryption,
  });
}

function cloudInitScript(
  accessKey: aws.iam.AccessKey,
  bucket: aws.s3.Bucket,
  artifactsPath: pulumi.Input<string>
): pulumi.Output<string> {
  return pulumi.interpolate`
aws configure set aws_access_key_id ${accessKey.id}
aws configure set aws_secret_access_key ${accessKey.secret}
yum update -y
amazon-linux-extras install docker
service docker start
curl --silent -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

SHADOWSOCKS_HOME=/opt/shadowsocks
mkdir $SHADOWSOCKS_HOME && aws s3 cp s3://${bucket.bucket}/${artifactsPath} $SHADOWSOCKS_HOME/ --recursive
docker-compose --project-directory $SHADOWSOCKS_HOME up --detach
`;
}
