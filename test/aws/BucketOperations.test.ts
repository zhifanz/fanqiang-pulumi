import { pulumiit } from "../helper";
import { BucketOperations } from "../../lib/aws/BucketOperations";
import _ from "lodash";

describe("BucketOperations", () => {
  pulumiit(
    "successfully create public bucket",
    async () => {
      new BucketOperations("fanqiang-test");
    },
    _.noop
  );
});
