import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatRowImportSummary,
  parseCustomerReadingsCsv,
  parseFlexibleDate,
} from "./csv-parse.js";
import { commitCustomerIngest } from "./ingest.js";
import { MemoryMeterStore } from "./memory-store.js";

const samplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../sample-data/messy-readings-july.csv",
);

describe("parseFlexibleDate", () => {
  it("parses mixed clerk formats", () => {
    assert.equal(parseFlexibleDate("07/15/2026")?.slice(0, 10), "2026-07-15");
    assert.equal(parseFlexibleDate("7/15/26")?.slice(0, 10), "2026-07-15");
    assert.equal(parseFlexibleDate("15-Jul-2026")?.slice(0, 10), "2026-07-15");
    assert.equal(
      parseFlexibleDate("July 15, 2026")?.slice(0, 10),
      "2026-07-15",
    );
  });
});

describe("parseCustomerReadingsCsv", () => {
  it("maps messy sample and keeps address with meter across name change", async () => {
    const text = readFileSync(samplePath, "utf8");
    const parsed = parseCustomerReadingsCsv(text);
    assert.equal(parsed.errors.length, 0);
    assert.ok(parsed.rows.length >= 10);
    assert.equal(parsed.mapping.serviceAddress, "Service Address");
    assert.equal(parsed.mapping.occupantName, "Customer");

    const store = new MemoryMeterStore();
    const summary = await commitCustomerIngest(store, "town-wiley", parsed);
    assert.equal(summary.addressConflicts.length, 0);
    assert.ok(summary.readingsWritten >= 10);

    const loc = await store.getLocation("town-wiley", "1042");
    assert.ok(loc);
    assert.equal(loc.serviceAddress, "112 N Main St Wiley CO");
    assert.equal(loc.occupantName, "A Rivera");
  });

  it("ignores stale saved mapping columns that are not in this file", () => {
    const text = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../../../sample-data/town-wiley-24mo/customer_readings_2024H2.csv",
      ),
      "utf8",
    );
    // Prior Excel export map (town-wiley MAP#) must not blank out Reading Date / Cumulative Reading.
    const parsed = parseCustomerReadingsCsv(text, {
      meterId: "Meter #",
      timestamp: "Read Dt",
      cumulativeReading: "Current Reading",
      serviceAddress: "Location / Address",
      occupantName: "Customer",
    });
    assert.equal(parsed.errors.length, 0);
    assert.ok(
      parsed.rowsAccepted >= 1400,
      `expected many rows, got ${parsed.rowsAccepted}`,
    );
    assert.equal(parsed.mapping.timestamp, "Reading Date");
    assert.equal(parsed.mapping.cumulativeReading, "Cumulative Reading");
    assert.match(parsed.warnings.join(" "), /Ignored saved column map/i);
  });

  it("counts accepted vs skipped rows for partial success", () => {
    const parsed = parseCustomerReadingsCsv(
      [
        "Meter ID,Service Address,Read Date,Reading (gal)",
        "1042,112 N Main,07/15/2026,100",
        ",112 N Main,07/15/2026,100",
        "1043,113 N Main,not-a-date,200",
        "1044,114 N Main,07/15/2026,300",
      ].join("\n"),
    );
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rowsSeen, 4);
    assert.equal(parsed.rowsAccepted, 2);
    assert.equal(parsed.rowsSkipped, 2);
    assert.match(
      formatRowImportSummary(parsed, "dry_run"),
      /2 of 4 rows would import.*2 skipped \(blank Meter ID/i,
    );
    assert.match(
      formatRowImportSummary(parsed, "committed"),
      /Imported 2 of 4 rows.*2 skipped \(blank Meter ID/i,
    );
    assert.match(
      formatRowImportSummary({ ...parsed, readingsWritten: 1 }, "committed"),
      /Imported 1 of 4 rows.*1 parse-ready row\(s\) were not written/i,
    );
  });

  it("does not relocate meter on address conflict", async () => {
    const store = new MemoryMeterStore();
    const first = parseCustomerReadingsCsv(
      "Meter ID,Customer,Service Address,Read Date,Reading (gal)\n1042,J Smith,112 N Main,06/15/2026,100\n",
    );
    await commitCustomerIngest(store, "t1", first);

    const second = parseCustomerReadingsCsv(
      "Meter ID,Customer,Service Address,Read Date,Reading (gal)\n1042,A Rivera,999 Other Rd,07/15/2026,200\n",
    );
    const summary = await commitCustomerIngest(store, "t1", second);
    assert.equal(summary.addressConflicts.length, 1);
    const loc = await store.getLocation("t1", "1042");
    assert.equal(loc?.serviceAddress, "112 N Main");
    assert.equal(loc?.occupantName, "A Rivera");
  });
});
