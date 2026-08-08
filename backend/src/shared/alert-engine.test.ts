import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessMeterConfidence, assessTenantConfidence, evaluateAlerts } from "./alert-engine.js";
import type { MeterLocation, MeterReading } from "./meter-location.js";

function loc(
  partial: Partial<MeterLocation> & Pick<MeterLocation, "meterId">,
): MeterLocation {
  return {
    tenantId: "t1",
    serviceAddress: `${partial.meterId} Addr`,
    occupantName: "X",
    accountNumber: null,
    route: "R3",
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
  meterId: string,
  timestamp: string,
  cumulativeReading: number,
  flags: string[] = [],
): MeterReading {
  return {
    tenantId: "t1",
    meterId,
    serviceAddress: `${meterId} Addr`,
    occupantName: "X",
    timestamp,
    cumulativeReading,
    unit: "gal",
    diagnosticFlags: flags,
  };
}

describe("assessTenantConfidence", () => {
  it("marks Thin for ~2 months", () => {
    const c = assessTenantConfidence(
      [
        rdg("1", "2026-06-15T00:00:00.000Z", 1),
        rdg("1", "2026-07-15T00:00:00.000Z", 2),
      ],
      1,
    );
    assert.equal(c.level, "Thin");
    assert.equal(c.statisticalMode, "Watch");
    assert.ok(c.coveragePct >= 50);
    assert.ok(c.displayScore > 0 && c.displayScore < 100);
    assert.ok(c.improveHint.length > 0);
  });

  it("stays Thin when coverage is under 50% even with 4 months", () => {
    const readings = [
      rdg("1", "2026-04-15T00:00:00.000Z", 1),
      rdg("1", "2026-05-15T00:00:00.000Z", 2),
      rdg("1", "2026-06-15T00:00:00.000Z", 3),
      rdg("1", "2026-07-15T00:00:00.000Z", 4),
    ];
    const c = assessTenantConfidence(readings, 4); // 1 of 4 meters → 25%
    assert.equal(c.level, "Thin");
    assert.equal(c.coveragePct, 25);
    assert.equal(c.statisticalMode, "Watch");
  });

  it("reaches Building at 3+ months with coverage ≥50%", () => {
    const readings = [
      rdg("1", "2026-05-15T00:00:00.000Z", 1),
      rdg("1", "2026-06-15T00:00:00.000Z", 2),
      rdg("1", "2026-07-15T00:00:00.000Z", 3),
      rdg("2", "2026-05-15T00:00:00.000Z", 1),
      rdg("2", "2026-06-15T00:00:00.000Z", 2),
      rdg("2", "2026-07-15T00:00:00.000Z", 3),
    ];
    const c = assessTenantConfidence(readings, 2);
    assert.equal(c.level, "Building");
    assert.equal(c.statisticalMode, "Watch");
  });
});

describe("evaluateAlerts", () => {
  it("flags stuck meter as Actionable and high usage as Watch when Thin", () => {
    const locations = [
      loc({ meterId: "1042" }),
      loc({ meterId: "1045" }),
      loc({ meterId: "1043" }),
      loc({ meterId: "1044" }),
    ];
    const readings = [
      rdg("1042", "2026-06-15T00:00:00.000Z", 1000),
      rdg("1042", "2026-07-15T00:00:00.000Z", 5000), // +4000
      rdg("1043", "2026-06-15T00:00:00.000Z", 1000),
      rdg("1043", "2026-07-15T00:00:00.000Z", 1100), // +100
      rdg("1044", "2026-06-15T00:00:00.000Z", 1000),
      rdg("1044", "2026-07-15T00:00:00.000Z", 1120), // +120
      rdg("1045", "2026-06-15T00:00:00.000Z", 0),
      rdg("1045", "2026-07-15T00:00:00.000Z", 0, ["NR"]),
    ];
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    assert.equal(confidence.level, "Thin");
    const stuck = alerts.find((a) => a.type === "stuck_meter");
    assert.ok(stuck);
    assert.equal(stuck.mode, "Actionable");
    const high = alerts.find(
      (a) => a.type === "unusual_high_usage" && a.meterId === "1042",
    );
    assert.ok(
      high,
      `alerts=${JSON.stringify(alerts.map((a) => a.type + ":" + a.meterId))}`,
    );
    assert.equal(high.mode, "Watch");
  });

  it("keeps diagnostic flags Actionable even when Thin", () => {
    const locations = [loc({ meterId: "m1" })];
    const readings = [
      rdg("m1", "2026-06-15T00:00:00.000Z", 100),
      rdg("m1", "2026-07-15T00:00:00.000Z", 200, ["L"]),
    ];
    const { confidence, alerts } = evaluateAlerts(locations, readings);
    assert.equal(confidence.level, "Thin");
    const diag = alerts.find((a) => a.type === "diagnostic_flag");
    assert.ok(diag);
    assert.equal(diag.mode, "Actionable");
    assert.deepEqual(diag.diagnosticFlags, ["LEAK"]);
  });

  it("flags LOW_BATTERY / TAMPER / REVERSE_FLOW as diagnostic Actionable", () => {
    const locations = [loc({ meterId: "m2" })];
    const readings = [
      rdg("m2", "2026-06-15T00:00:00.000Z", 100),
      rdg("m2", "2026-07-15T00:00:00.000Z", 200, ["LOW_BATTERY", "tamper"]),
    ];
    const { alerts } = evaluateAlerts(locations, readings);
    const diag = alerts.find((a) => a.type === "diagnostic_flag");
    assert.ok(diag);
    assert.equal(diag.mode, "Actionable");
    assert.ok(diag.diagnosticFlags?.includes("LOW_BATTERY"));
    assert.ok(diag.diagnosticFlags?.includes("TAMPER"));
  });

  it("assessMeterConfidence tiers by months", () => {
    const readings = [
      rdg("m1", "2026-01-15T00:00:00.000Z", 100),
      rdg("m1", "2026-02-15T00:00:00.000Z", 110),
      rdg("m1", "2026-03-15T00:00:00.000Z", 120),
    ];
    assert.equal(assessMeterConfidence(readings), "Building");
  });

  it("attaches per-meter Confidence on alerts", () => {
    const locations = [loc({ meterId: "m2" })];
    const readings = [
      rdg("m2", "2026-06-15T00:00:00.000Z", 100),
      rdg("m2", "2026-07-15T00:00:00.000Z", 200, ["LOW_BATTERY", "tamper"]),
    ];
    const { alerts } = evaluateAlerts(locations, readings);
    const diag = alerts.find((a) => a.type === "diagnostic_flag");
    assert.ok(diag?.meterConfidence);
    assert.equal(diag.meterConfidence, "Thin");
  });

  it("honors persisted tenant confidence override", () => {
    const locations = [loc({ meterId: "m1" })];
    const readings = [rdg("m1", "2026-07-15T00:00:00.000Z", 100)];
    const stored = assessTenantConfidence(
      [
        rdg("m1", "2026-01-15T00:00:00.000Z", 90),
        rdg("m1", "2026-02-15T00:00:00.000Z", 95),
        rdg("m1", "2026-03-15T00:00:00.000Z", 100),
        rdg("m1", "2026-04-15T00:00:00.000Z", 105),
        rdg("m1", "2026-05-15T00:00:00.000Z", 110),
        rdg("m1", "2026-06-15T00:00:00.000Z", 115),
      ],
      1,
    );
    const { confidence } = evaluateAlerts(locations, readings, {
      confidence: stored,
    });
    assert.equal(confidence.level, stored.level);
    assert.equal(confidence.statisticalMode, stored.statisticalMode);
  });
});
