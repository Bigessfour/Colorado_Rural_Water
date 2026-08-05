import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  createAlertStatusStoreFromEnv,
  createBalanceThresholdStoreFromEnv,
  createConversationStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
  createTenantStoreFromEnv,
  DynamoMeterStore,
} from "./dynamo-store.js";

describe("dynamo-store env factories", () => {
  const prevTable = process.env.DATA_TABLE;

  afterEach(() => {
    if (prevTable === undefined) delete process.env.DATA_TABLE;
    else process.env.DATA_TABLE = prevTable;
  });

  it("throws when DATA_TABLE is missing", () => {
    delete process.env.DATA_TABLE;
    for (const factory of [
      createMeterStoreFromEnv,
      createSourceStoreFromEnv,
      createAlertStatusStoreFromEnv,
      createBalanceThresholdStoreFromEnv,
      createTenantStoreFromEnv,
      createConversationStoreFromEnv,
    ]) {
      assert.throws(() => factory(), /DATA_TABLE env is not configured/);
    }
  });

  it("returns DynamoMeterStore when DATA_TABLE is set", () => {
    process.env.DATA_TABLE = "water-saver-test-table";
    const store = createMeterStoreFromEnv();
    assert.ok(store instanceof DynamoMeterStore);
  });
});
