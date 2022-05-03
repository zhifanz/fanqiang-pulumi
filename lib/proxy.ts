import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { readFile } from "fs/promises";
import * as _ from "lodash";
import * as domain from "./domain";
import defaultResource from "./resourceUtils";

export async function apply(
  bucket: aws.s3.Bucket,
  shadowsocksConfig: domain.ShadowsocksConfiguration
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

  const instance: aws.lightsail.Instance = defaultResource(
    aws.lightsail.Instance,
    {
      availabilityZone: `${(await aws.getRegion()).name}a`,
      blueprintId: "amazon_linux_2",
      bundleId: "nano_2_0",
      userData,
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
