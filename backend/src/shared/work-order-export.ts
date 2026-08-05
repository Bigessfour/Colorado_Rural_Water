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
