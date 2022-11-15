import { applyProgram, assertConnectSuccess } from "../helper";
import { createPostgresInternetAccessEventRepository } from "../../lib/core/analysis/PostgresInternetAccessEventRepository";

describe("PostgresInternetAccessEventRepository", () => {
  it("create repository", async () => {
    const result = await applyProgram(async function () {
      const repo = createPostgresInternetAccessEventRepository("Password#1");
      return {
        host: repo.database.masterEndpointAddress,
        port: repo.database.masterEndpointPort,
      };
    });
    assertConnectSuccess(
      result.outputs["host"].value,
      result.outputs["port"].value
    );
  });
});
