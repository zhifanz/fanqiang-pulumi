import { Resource } from "@pulumi/pulumi";
import { BucketObject, BucketObjectArgs } from "@pulumi/aws/s3";
import {
  AccessKey,
  AccessKeyArgs,
  User,
  UserArgs,
  UserPolicy,
  UserPolicyArgs,
} from "@pulumi/aws/iam";
import {
  Instance,
  InstanceArgs,
  InstancePublicPorts,
  InstancePublicPortsArgs,
} from "@pulumi/aws/lightsail";
import {
  AspectCapable,
  ResourceArgumentPreprocessor,
  ResourcePostprocessor,
} from "./AspectCapable";

export interface AwsResourceFactory {
  preprocessResourceArgument(): void;

  newBucketObject(
    name: string,
    args: BucketObjectArgs,
    parent?: Resource
  ): BucketObject;

  newUser(name: string, args: UserArgs, parent?: Resource): User;

  newUserPolicy(
    name: string,
    args: UserPolicyArgs,
    parent?: Resource
  ): UserPolicy;

  newAccessKey(name: string, args: AccessKeyArgs, parent?: Resource): AccessKey;

  newLightsailInstance(
    name: string,
    args: InstanceArgs,
    parent?: Resource
  ): Instance;

  newLightsailInstancePublicPorts(
    name: string,
    args: InstancePublicPortsArgs,
    parent?: Resource
  ): InstancePublicPorts;
}
