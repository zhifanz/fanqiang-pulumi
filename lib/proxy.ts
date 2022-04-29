import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { readFile } from "fs/promises";
import _ from "lodash";

export type ShadowsocksConfiguration = {
  password: string;
  port: number;
  encryption: string;
};

export async function apply(
  bucket: aws.s3.Bucket,
  shadowsocksConfig: ShadowsocksConfiguration
): Promise<{ publicIpAddress: pulumi.Output<string> }> {
  const artifactsPath = "proxy";
  new aws.s3.BucketObject("shadowsocksConfig", {
    bucket: bucket.id,
    key: artifactsPath + "/config.json",
    forceDestroy: true,
    content: JSON.stringify({
      server: "::",
      server_port: shadowsocksConfig.port,
      password: shadowsocksConfig.password,
      method: shadowsocksConfig.encryption,
    }),
  });
  new aws.s3.BucketObject("shadowsocksDockerCompose", {
    bucket: bucket.id,
    key: artifactsPath + "/docker-compose.yml",
    forceDestroy: true,
    source: new pulumi.asset.FileAsset(__dirname + "/docker-compose.yml"),
  });
  const agentUser = new aws.iam.User("defaultAgent", { forceDestroy: true });
  new aws.iam.UserPolicy("defaultAgent", {
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
  const accessKey = new aws.iam.AccessKey("defaultAgent", {
    user: agentUser.name,
  });
  const userDataTemplate = await readFile(
    __dirname + "/cloud-init.tpl",
    "utf8"
  );
  const userData: pulumi.Output<any> = pulumi
    .all([accessKey.id, accessKey.secret, bucket.bucket])
    .apply(([id, secret, bucketName]) => {
      return _.template(userDataTemplate)({
        accessKeyId: id,
        accessKeySecret: secret,
        artifactsUri: `s3://${bucketName}/${artifactsPath}`,
      });
    });

  const instance = new aws.lightsail.Instance("default", {
    availabilityZone: `${(await aws.getRegion()).name}a`,
    blueprintId: "amazon_linux_2",
    bundleId: "nano_2_0",
    userData,
  });
  new aws.lightsail.InstancePublicPorts("default", {
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
