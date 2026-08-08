import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingestJobPayloadKey } from "../handlers/ingest-jobs.js";
import { SYNC_INGEST_MAX_ROWS } from "../shared/ingest-limits.js";
import { handler } from "./ingest.js";
import { authedEvent, statusOf } from "./_test-event.js";

describe("ingest limits", () => {
  it("sync max rows matches product constant", () => {
    assert.equal(SYNC_INGEST_MAX_ROWS, 250);
  });
});

describe("POST /ingest sync cap", () => {
  it("returns 413 when commit exceeds sync row limit", async () => {
    const header =
      "meter_id,service_address,reading,reading_date,account_id,customer";
    const rows = Array.from(
      { length: SYNC_INGEST_MAX_ROWS + 1 },
      (_, i) => `M-${i},100 Main St,${1000 + i},2026-07-01,A-${i},Person ${i}`,
    );
    const csv = [header, ...rows].join("\n");
    const res = await handler(
      authedEvent({
        method: "POST",
        path: "/ingest",
        body: JSON.stringify({ csvText: csv, dryRun: false }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 413);
    const body = JSON.parse((res as { body: string }).body);
    assert.equal(body.useBackgroundJob, true);
    assert.ok(body.rowCount > SYNC_INGEST_MAX_ROWS);
  });

  it("dryRun flags background job for large files", async () => {
    const header =
      "meter_id,service_address,reading,reading_date,account_id,customer";
    const rows = Array.from(
      { length: SYNC_INGEST_MAX_ROWS + 5 },
      (_, i) => `M-${i},100 Main St,${1000 + i},2026-07-01,A-${i},Person ${i}`,
    );
    const csv = [header, ...rows].join("\n");
    const res = await handler(
      authedEvent({
        method: "POST",
        path: "/ingest",
        body: JSON.stringify({ csvText: csv, dryRun: true }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 200);
    const body = JSON.parse((res as { body: string }).body);
    assert.equal(body.useBackgroundJob, true);
  });
});

describe("ingest job payload key", () => {
  it("scopes S3 keys under tenant prefix", () => {
    assert.equal(
      ingestJobPayloadKey("town-wiley", "abc"),
      "tenants/town-wiley/ingest-jobs/abc.json",
    );
  });
});
