import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource } from "@pulumi/pulumi";
import { DEFAULT_RESOURCE_NAME } from "../utils";

export class AgentUser extends ComponentResource {
  private static readonly type = "AgentUser";
  private readonly user: aws.iam.User;
  private readonly accessKey: aws.iam.AccessKey;
  private get defaultResourceName(): string {
    return `${AgentUser.type}-${DEFAULT_RESOURCE_NAME}`;
  }
  constructor() {
    super(AgentUser.type, DEFAULT_RESOURCE_NAME);
    this.user = new aws.iam.User(
      this.defaultResourceName,
      {
        forceDestroy: true,
      },
      { parent: this }
    );
    this.accessKey = new aws.iam.AccessKey(
      this.defaultResourceName,
      {
        user: this.user.name,
      },
      { parent: this }
    );
  }

  get accessKeyId(): pulumi.Output<string> {
    return this.accessKey.id;
  }

  get accessKeySecret(): pulumi.Output<string> {
    return this.accessKey.secret;
  }

  allowAccess(
    name: string,
    actions: string,
    ...resources: pulumi.Input<string>[]
  ): aws.iam.UserPolicy {
    const policy = pulumi.all([...resources]).apply((rs) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: actions,
            Resource: rs,
          },
        ],
      })
    );
    return new aws.iam.UserPolicy(
      `${this.defaultResourceName}-${name}`,
      {
        user: this.user.name,
        policy,
      },
      { parent: this }
    );
  }
}
