import {
  ComponentResource,
  CustomResource,
  Input,
  Inputs,
  Resource,
} from "@pulumi/pulumi";
import { AwsResourceFactory } from "./AwsResourceFactory";

export type ResourceArgumentPreprocessor<T> = (args: T) => T;
export type ResourcePostprocessor<R> = (resource: R) => void;

export interface AspectCapable {
  readonly preprocessors: ResourceArgumentPreprocessor<any>[];
  readonly postprocessors: ResourcePostprocessor<any>[];
}
