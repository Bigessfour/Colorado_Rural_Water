import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkOrderMapLink,
  buildWorkOrdersCsv,
  buildWorkOrdersPrintableHtml,
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

  it("printable HTML has one page per Actionable meter", () => {
    const html = buildWorkOrdersPrintableHtml({
      tenantId: "town-wiley",
      displayName: "Town of Wiley",
      generatedAt: "2026-08-06T12:00:00.000Z",
      actionableOnly: true,
      rows: [
        row,
        {
          ...row,
          meterId: "99",
          mode: "Watch",
          summary: "Thin history",
        },
      ],
    });
    assert.match(html, /Field work order/);
    assert.match(html, /1042/);
    assert.doesNotMatch(html, />99</);
    assert.match(html, /Field notes/);
    assert.match(html, /page-break-after/);
  });
});
