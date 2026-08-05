import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryMeterStore } from "./memory-store.js";
import {
  parseMeterCreateBody,
  parseMeterMetadataPatch,
  type MeterLocation,
  type MeterReading,
} from "./meter-location.js";

function loc(
  partial: Partial<MeterLocation> &
    Pick<MeterLocation, "tenantId" | "meterId" | "serviceAddress">,
): MeterLocation {
  return {
    occupantName: null,
    accountNumber: null,
    route: null,
    manufacturer: null,
    model: null,
    serialNumber: null,
    meterSize: null,
    installDate: null,
    meterType: null,
    locationDetail: null,
    radioId: null,
    lastTestedAt: null,
    notes: null,
    latitude: null,
    longitude: null,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function rdg(
  partial: Partial<MeterReading> &
    Pick<
      MeterReading,
      "tenantId" | "meterId" | "timestamp" | "cumulativeReading"
    >,
): MeterReading {
  return {
    serviceAddress: `${partial.meterId} Addr`,
    occupantName: null,
    unit: "gal",
    diagnosticFlags: [],
    ...partial,
  };
}

describe("parseMeterCreateBody", () => {
  it("requires meterId and serviceAddress", () => {
    assert.equal(parseMeterCreateBody("t1", {}).ok, false);
    assert.equal(parseMeterCreateBody("t1", { meterId: "1" }).ok, false);
    assert.equal(
      parseMeterCreateBody("t1", { serviceAddress: "1 Main" }).ok,
      false,
    );
  });

  it("creates a location with optional metadata", () => {
    const parsed = parseMeterCreateBody("t1", {
      meterId: "1042",
      serviceAddress: "112 N Main St",
      occupantName: "A Rivera",
      manufacturer: "Badger",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.location.tenantId, "t1");
    assert.equal(parsed.location.meterId, "1042");
    assert.equal(parsed.location.serviceAddress, "112 N Main St");
    assert.equal(parsed.location.occupantName, "A Rivera");
    assert.equal(parsed.location.manufacturer, "Badger");
    assert.equal(parsed.location.model, null);
  });
});

describe("parseMeterMetadataPatch address stability", () => {
  it("rejects serviceAddress change with clear message", () => {
    const parsed = parseMeterMetadataPatch({ serviceAddress: "999 Other" });
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /Service address cannot be changed/i);
    assert.match(parsed.error, /support|relocate/i);
  });
});

describe("MemoryMeterStore inventory CRUD isolation", () => {
  it("lists only the caller tenant meters", async () => {
    const store = new MemoryMeterStore();
    await store.putLocation(
      loc({ tenantId: "a", meterId: "1", serviceAddress: "A St" }),
    );
    await store.putLocation(
      loc({ tenantId: "b", meterId: "1", serviceAddress: "B St" }),
    );

    const a = await store.listLocations("a");
    const b = await store.listLocations("b");
    assert.equal(a.length, 1);
    assert.equal(a[0].serviceAddress, "A St");
    assert.equal(b.length, 1);
    assert.equal(b[0].serviceAddress, "B St");
  });

  it("create duplicate is detectable via getLocation", async () => {
    const store = new MemoryMeterStore();
    const created = parseMeterCreateBody("a", {
      meterId: "1042",
      serviceAddress: "112 N Main",
    });
    assert.ok(created.ok);
    if (!created.ok) return;
    await store.putLocation(created.location);
    const existing = await store.getLocation("a", "1042");
    assert.ok(existing);
    assert.equal(existing.serviceAddress, "112 N Main");
    // Cross-tenant same id is a different row
    assert.equal(await store.getLocation("b", "1042"), null);
  });

  it("delete is tenant-scoped", async () => {
    const store = new MemoryMeterStore();
    await store.putLocation(
      loc({ tenantId: "a", meterId: "1", serviceAddress: "A St" }),
    );
    assert.equal(await store.deleteLocation("b", "1"), false);
    assert.equal(await store.deleteLocation("a", "1"), true);
    assert.equal(await store.getLocation("a", "1"), null);
  });

  it("delete cascades readings for that meter only", async () => {
    const store = new MemoryMeterStore();
    await store.putLocation(
      loc({ tenantId: "a", meterId: "1", serviceAddress: "A St" }),
    );
    await store.putLocation(
      loc({ tenantId: "a", meterId: "2", serviceAddress: "B St" }),
    );
    await store.putReading(
      rdg({
        tenantId: "a",
        meterId: "1",
        timestamp: "2026-07-01T00:00:00.000Z",
        cumulativeReading: 10,
      }),
    );
    await store.putReading(
      rdg({
        tenantId: "a",
        meterId: "1",
        timestamp: "2026-07-15T00:00:00.000Z",
        cumulativeReading: 20,
      }),
    );
    await store.putReading(
      rdg({
        tenantId: "a",
        meterId: "2",
        timestamp: "2026-07-01T00:00:00.000Z",
        cumulativeReading: 5,
      }),
    );
    await store.putReading(
      rdg({
        tenantId: "b",
        meterId: "1",
        timestamp: "2026-07-01T00:00:00.000Z",
        cumulativeReading: 99,
      }),
    );

    assert.equal(await store.deleteLocation("a", "1"), true);
    assert.equal((await store.listReadingsForMeter("a", "1")).length, 0);
    assert.equal((await store.listReadingsForMeter("a", "2")).length, 1);
    assert.equal((await store.listReadingsForMeter("b", "1")).length, 1);
    assert.equal(await store.getLocation("a", "1"), null);
    assert.ok(await store.getLocation("a", "2"));
  });
});
