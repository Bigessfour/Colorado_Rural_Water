import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DynamoReviewStore, createReviewStoreFromEnv } from "./review-store.js";

describe("review-store env wiring", () => {
  const prevTable = process.env.DATA_TABLE;

  afterEach(() => {
    if (prevTable === undefined) delete process.env.DATA_TABLE;
    else process.env.DATA_TABLE = prevTable;
  });

  it("createReviewStoreFromEnv throws without DATA_TABLE", () => {
    delete process.env.DATA_TABLE;
    assert.throws(
      () => createReviewStoreFromEnv(),
      /DATA_TABLE env is not configured/,
    );
  });

  it("createReviewStoreFromEnv returns DynamoReviewStore when configured", () => {
    process.env.DATA_TABLE = "water-saver-test-table";
    const store = createReviewStoreFromEnv();
    assert.ok(store instanceof DynamoReviewStore);
  });
});
