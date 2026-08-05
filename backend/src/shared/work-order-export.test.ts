import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkOrderMapLink,
  buildWorkOrdersCsv,
  buildWorkOrdersXlsxBuffer,
  recommendedActionForRow,
} from "./work-order-export.js";

describe("work-order-export", () => {
  const row = {
    meterId: "1042",
    serviceAddress: "123 Main St",
    occupantName: "Smith",
    latitude: 38.0,
    longitude: -102.0,
    mapLink: buildWorkOrderMapLink("1042", "https://app.example.com"),
    mode: "Actionable" as const,
    type: "high_usage",
    summary: "Unusual usage spike",
    confidenceNote: "Solid history",
    status: "open",
    recommendedAction: recommendedActionForRow({
      mode: "Actionable",
      type: "high_usage",
      summary: "Unusual usage spike",
    }),
  };

  it("CSV includes map link and recommended action columns", () => {
    const csv = buildWorkOrdersCsv([row]);
    assert.match(csv, /1042/);
    assert.match(csv, /mapLink/);
    assert.match(csv, /recommendedAction/);
    assert.match(csv, /selected=1042/);
  });

  it("XLSX buffer is non-empty", () => {
    const buf = buildWorkOrdersXlsxBuffer([row]);
    assert.ok(buf.length > 100);
  });

  it("Watch rows get cautious recommended action", () => {
    const action = recommendedActionForRow({
      mode: "Watch",
      type: null,
      summary: "Statistical outlier",
    });
    assert.match(action, /Watch/i);
  });
});
