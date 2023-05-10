import { pulumiit } from "../helper";
import { BucketOperations } from "../../lib/aws/BucketOperations";

describe("BucketOperations", () => {
  pulumiit(
    "successfully create public bucket",
    async () => {
      new BucketOperations("fanqiang-test");
    },
    () => {}
  );
});
