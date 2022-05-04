import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as _ from "lodash";
import * as domain from "./domain";
import { defaultResource } from "./utils";

export function apply(
  bucket: aws.s3.Bucket,
  shadowsocksConfig: domain.ShadowsocksConfiguration
): { publicIpAddress: pulumi.Output<string> } {
  const artifactsPath = "proxy";
  new aws.s3.BucketObject("shadowsocksConfig", {
    bucket: bucket.id,
    key: artifactsPath + "/config.json",
    forceDestroy: true,
    content: shadowsocksConfigFileContent(shadowsocksConfig),
  });
  new aws.s3.BucketObject("shadowsocksDockerCompose", {
    bucket: bucket.id,
    key: artifactsPath + "/docker-compose.yml",
    forceDestroy: true,
    source: new pulumi.asset.FileAsset(__dirname + "/docker-compose.yml"),
  });
  const agentUser: aws.iam.User = defaultResource(aws.iam.User, {
    forceDestroy: true,
  });
  defaultResource(aws.iam.UserPolicy, {
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
  });
  const accessKey: aws.iam.AccessKey = defaultResource(aws.iam.AccessKey, {
    user: agentUser.name,
  });

  const instance: aws.lightsail.Instance = defaultResource(
    aws.lightsail.Instance,
    {
      availabilityZone: pulumi.concat(pulumi.output(aws.getRegion()).name, "a"),
      blueprintId: "amazon_linux_2",
      bundleId: "nano_2_0",
      userData: cloudInitScript(accessKey, bucket, artifactsPath),
    }
  );
  defaultResource(aws.lightsail.InstancePublicPorts, {
    instanceName: instance.name,
    portInfos: [
      {
        protocol: "tcp",
        fromPort: shadowsocksConfig.port,
        toPort: shadowsocksConfig.port,
      },
    ],
  });
  return { publicIpAddress: instance.publicIpAddress };
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
