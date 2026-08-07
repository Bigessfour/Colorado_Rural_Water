/**
 * Work order export for flagged meters (Feature 012).
 * Extends C4 CSV with coordinates, map link, and field-action column for clerks.
 */

import * as XLSX from "xlsx";
import { csvCell } from "./flagged-export.js";

export interface WorkOrderRow {
  meterId: string;
  serviceAddress?: string | null;
  occupantName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapLink?: string | null;
  mode: "Watch" | "Actionable" | string;
  type?: string | null;
  summary: string;
  confidenceNote: string;
  status?: string | null;
  recommendedAction: string;
}

const WORK_ORDER_HEADERS = [
  "meterId",
  "serviceAddress",
  "occupantName",
  "latitude",
  "longitude",
  "mapLink",
  "mode",
  "type",
  "summary",
  "confidenceNote",
  "status",
  "recommendedAction",
] as const;

export function recommendedActionForRow(
  row: Pick<WorkOrderRow, "mode" | "type" | "summary">,
): string {
  if (row.mode === "Watch") {
    return "Review when convenient — Watch flag (not dig-now on thin history).";
  }
  if (row.type === "stuck" || /stuck|non-register/i.test(row.summary)) {
    return "Field check: verify register / endpoint; repair or replace if stuck.";
  }
  if (row.type === "diagnostic" || /diagnostic/i.test(row.summary)) {
    return "Field check: follow handheld diagnostic flag guidance.";
  }
  if (/drop|sudden/i.test(row.summary)) {
    return "Investigate possible leak, theft, or meter failure at location.";
  }
  return "Schedule field visit — Actionable alert.";
}

export function buildWorkOrderMapLink(
  meterId: string,
  appBaseUrl?: string,
): string {
  const base = (appBaseUrl ?? "").replace(/\/$/, "");
  const path = `/meters?selected=${encodeURIComponent(meterId)}&view=map`;
  return base ? `${base}${path}` : path;
}

export function buildWorkOrdersCsv(rows: WorkOrderRow[]): string {
  const lines = [WORK_ORDER_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.meterId),
        csvCell(row.serviceAddress),
        csvCell(row.occupantName),
        csvCell(row.latitude == null ? "" : String(row.latitude)),
        csvCell(row.longitude == null ? "" : String(row.longitude)),
        csvCell(row.mapLink),
        csvCell(row.mode),
        csvCell(row.type),
        csvCell(row.summary),
        csvCell(row.confidenceNote),
        csvCell(row.status ?? "open"),
        csvCell(row.recommendedAction),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildWorkOrdersXlsxBuffer(rows: WorkOrderRow[]): Buffer {
  const sheetRows = rows.map((row) => ({
    meterId: row.meterId,
    serviceAddress: row.serviceAddress ?? "",
    occupantName: row.occupantName ?? "",
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    mapLink: row.mapLink ?? "",
    mode: row.mode,
    type: row.type ?? "",
    summary: row.summary,
    confidenceNote: row.confidenceNote,
    status: row.status ?? "open",
    recommendedAction: row.recommendedAction,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows, {
    header: [...WORK_ORDER_HEADERS],
  });
  XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface WorkOrdersPrintInput {
  tenantId: string;
  displayName: string;
  generatedAt: string;
  /** When true, only Actionable rows (default for printable field sheets). */
  actionableOnly?: boolean;
  rows: WorkOrderRow[];
}

/**
 * Printable single-meter work-order sheets (one page per alert).
 * Browser Print → Save as PDF; no server-side PDF engine.
 */
export function buildWorkOrdersPrintableHtml(input: WorkOrdersPrintInput): string {
  const actionableOnly = input.actionableOnly !== false;
  const rows = actionableOnly
    ? input.rows.filter((r) => r.mode === "Actionable")
    : input.rows;

  const sheets =
    rows.length === 0
      ? `<section class="sheet empty">
  <h1>Water Saver — Field work order</h1>
  <p class="meta">${escHtml(input.displayName)} · ${escHtml(input.tenantId)} · ${escHtml(input.generatedAt)}</p>
  <p>No ${actionableOnly ? "Actionable" : "open"} flagged meters right now. Check Alerts or export CSV for Watch rows.</p>
</section>`
      : rows
          .map((row, i) => {
            const coords =
              row.latitude != null && row.longitude != null
                ? `${row.latitude}, ${row.longitude}`
                : "— (pin on Meters map before printing when possible)";
            const mapsUrl =
              row.latitude != null && row.longitude != null
                ? `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=17/${row.latitude}/${row.longitude}`
                : row.mapLink ?? "";
            return `<section class="sheet">
  <header>
    <h1>Water Saver — Field work order</h1>
    <p class="meta">${escHtml(input.displayName)} · Sheet ${i + 1} of ${rows.length} · ${escHtml(input.generatedAt)}</p>
  </header>
  <dl class="grid">
    <div><dt>Meter ID</dt><dd class="mono">${escHtml(row.meterId)}</dd></div>
    <div><dt>Service address</dt><dd>${escHtml(row.serviceAddress ?? "—")}</dd></div>
    <div><dt>Occupant</dt><dd>${escHtml(row.occupantName ?? "—")}</dd></div>
    <div><dt>Status</dt><dd>${escHtml(row.status ?? "open")}</dd></div>
    <div><dt>Mode</dt><dd><strong>${escHtml(row.mode)}</strong></dd></div>
    <div><dt>Alert type</dt><dd>${escHtml(row.type ?? "—")}</dd></div>
    <div class="span2"><dt>Coordinates</dt><dd class="mono">${escHtml(coords)}</dd></div>
    <div class="span2"><dt>Map</dt><dd>${
      mapsUrl
        ? `<a href="${escHtml(mapsUrl)}">${escHtml(mapsUrl)}</a>`
        : "—"
    }</dd></div>
  </dl>
  <h2>Why flagged</h2>
  <p>${escHtml(row.summary)}</p>
  <h2>Confidence note</h2>
  <p>${escHtml(row.confidenceNote)}</p>
  <h2>Recommended field action</h2>
  <p class="action">${escHtml(row.recommendedAction)}</p>
  <h2>Field notes</h2>
  <div class="notes" aria-hidden="true"></div>
  <p class="foot">Clerk → print this sheet → hand to field → after visit, open Alerts → Resolve with a short note (closes the loop on meter history).</p>
</section>`;
          })
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Water Saver — Work orders — ${escHtml(input.displayName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #1a1a1a; background: #fff; }
    .sheet { max-width: 7.5in; margin: 0.6in auto; padding: 0 0.4in 0.5in; page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
    .sheet.empty { page-break-after: auto; }
    h1 { font-size: 1.25rem; margin: 0 0 0.2rem; }
    h2 { font-size: 0.95rem; margin: 0.9rem 0 0.35rem; color: #333; }
    .meta { color: #555; font-size: 0.85rem; margin: 0 0 0.85rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem 1rem; margin: 0; }
    .grid .span2 { grid-column: 1 / -1; }
    dt { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    dd { margin: 0.1rem 0 0; font-size: 0.95rem; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; }
    .action { font-weight: 600; }
    .notes {
      min-height: 2.8in;
      border: 1px dashed #999;
      border-radius: 4px;
      background: repeating-linear-gradient(
        transparent,
        transparent 1.35rem,
        #eee 1.35rem,
        #eee calc(1.35rem + 1px)
      );
    }
    .foot { margin-top: 0.85rem; font-size: 0.75rem; color: #666; }
    a { color: #0b5fff; word-break: break-all; }
    @media print {
      .sheet { margin: 0.4in; max-width: none; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
${sheets}
</body>
</html>`;
}
