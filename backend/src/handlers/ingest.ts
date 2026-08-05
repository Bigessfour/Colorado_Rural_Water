import type { AuthedHandler } from "../shared/apigw.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import {
  MAX_CSV_CHARS,
  formatRowImportSummary,
  parseCustomerReadingsCsv,
  type ColumnMapping,
} from "../shared/csv-parse.js";
import {
  MAX_EXCEL_BASE64_CHARS,
  MAX_EXCEL_BYTES,
  bufferFromBase64,
  listWorkbookSheets,
  looksLikeExcelBuffer,
  parseCustomerReadingsExcel,
} from "../shared/excel-parse.js";
import { createMeterStoreFromEnv } from "../shared/dynamo-store.js";
import { commitCustomerIngest } from "../shared/ingest.js";
import { badRequest, forbidden, ok, unauthorized } from "../shared/http.js";

/** Stay under API Gateway HTTP API ~10 MiB payload; leave headroom for JSON wrappers. */
const MAX_INGEST_BODY_CHARS = 8 * 1024 * 1024;

/**
 * POST /ingest — parse customer CSV or Excel and write meter locations + readings.
 *
 * Demo day: upload → parse → Dynamo under the JWT tenant only (messy CSV fixture
 * in sample-data/). Prefer dryRun from the SPA column mapper before commit.
 *
 * Body:
 *   { csvText, mapping?, dryRun? }
 *   { excelBase64, sheetName?, mergeArchive?, mapping?, dryRun? }
 *   { listSheets: true, excelBase64 } — return sheet names only
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== "object") {
    return unauthorized();
  }

  // Isolation: tenant_id from JWT claims — never from the ingest body.
  let tenantId: string;
  try {
    tenantId = requireTenantId(
      parseAuthFromClaims(claims as Record<string, unknown>),
    );
  } catch (err) {
    return forbidden(err instanceof Error ? err.message : "Forbidden");
  }

  if (!event.body) {
    return badRequest("JSON body with csvText or excelBase64 is required");
  }

  if (event.body.length > MAX_INGEST_BODY_CHARS) {
    return badRequest(
      `Request body is too large (max ${MAX_INGEST_BODY_CHARS} characters). Use a smaller file or the S3 drop-zone.`,
    );
  }

  let csvText: string | undefined;
  let excelBase64: string | undefined;
  let sheetName: string | undefined;
  let mergeArchive = false;
  let listSheets = false;
  let mapping: ColumnMapping | undefined;
  let dryRun = false;

  try {
    const parsed = JSON.parse(event.body) as {
      csvText?: string;
      excelBase64?: string;
      sheetName?: string;
      mergeArchive?: boolean;
      listSheets?: boolean;
      mapping?: ColumnMapping;
      dryRun?: boolean;
    };
    csvText = parsed.csvText;
    excelBase64 = parsed.excelBase64;
    sheetName = parsed.sheetName;
    mergeArchive = Boolean(parsed.mergeArchive);
    listSheets = Boolean(parsed.listSheets);
    mapping = parsed.mapping;
    dryRun = Boolean(parsed.dryRun);
  } catch {
    return badRequest("Body must be JSON");
  }

  if (excelBase64 != null && typeof excelBase64 !== "string") {
    return badRequest("excelBase64 must be a string");
  }
  if (csvText != null && typeof csvText !== "string") {
    return badRequest("csvText must be a string");
  }
  if (excelBase64 && excelBase64.length > MAX_EXCEL_BASE64_CHARS) {
    return badRequest(
      `excelBase64 is too large (max ~${MAX_EXCEL_BYTES} bytes decoded). Use a smaller workbook or S3 upload.`,
    );
  }
  if (csvText && csvText.length > MAX_CSV_CHARS) {
    return badRequest(
      `csvText is too large (max ${MAX_CSV_CHARS} characters). Split the export or use S3 upload.`,
    );
  }

  if (listSheets) {
    if (!excelBase64?.trim())
      return badRequest("excelBase64 is required when listSheets is true");
    try {
      const buf = bufferFromBase64(excelBase64);
      if (!looksLikeExcelBuffer(buf)) {
        return badRequest(
          "excelBase64 does not look like an Excel file (.xlsx / .xls)",
        );
      }
      const sheets = listWorkbookSheets(buf);
      return ok({
        tenantId,
        sheets,
        preferredSheet:
          sheets.find((s) => s.preferred && !s.archive)?.name ?? null,
      });
    } catch (err) {
      return badRequest(
        err instanceof Error ? err.message : "Could not read Excel workbook",
      );
    }
  }

  const hasCsv = Boolean(csvText?.trim());
  const hasExcel = Boolean(excelBase64?.trim());
  if (!hasCsv && !hasExcel) {
    return badRequest("csvText or excelBase64 is required");
  }

  let result;
  try {
    if (hasExcel) {
      const buf = bufferFromBase64(excelBase64!);
      if (!looksLikeExcelBuffer(buf)) {
        return badRequest(
          "excelBase64 does not look like an Excel file (.xlsx / .xls)",
        );
      }
      result = parseCustomerReadingsExcel(buf, {
        sheetName,
        mergeArchive,
        mapping,
      });
    } else {
      result = parseCustomerReadingsCsv(csvText!, mapping);
    }
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Parse failed");
  }

  if (result.errors.length) {
    return badRequest(result.errors.join(" "), {
      mapping: result.mapping,
      warnings: result.warnings,
      sheets: "sheets" in result ? result.sheets : undefined,
      selectedSheet:
        "selectedSheet" in result ? result.selectedSheet : undefined,
      status: {
        phase: "failed",
        friendly:
          "We found problems in this file. Fix the rows below, or adjust column mapping, then try again.",
        warningCount: result.warnings.length,
        errorCount: result.errors.length,
      },
    });
  }

  const rowCounts = {
    rowsSeen: result.rowsSeen,
    rowsAccepted: result.rowsAccepted,
    rowsSkipped: result.rowsSkipped,
    rowsDeduped: result.rowsDeduped,
  };

  if (dryRun) {
    return ok({
      dryRun: true,
      tenantId,
      mapping: result.mapping,
      rowCount: result.rows.length,
      ...rowCounts,
      warnings: result.warnings,
      sample: result.rows.slice(0, 3),
      sheets: "sheets" in result ? result.sheets : undefined,
      selectedSheet:
        "selectedSheet" in result ? result.selectedSheet : undefined,
      mergedSheets: "mergedSheets" in result ? result.mergedSheets : undefined,
      status: {
        phase: "dry_run_ok",
        friendly: formatRowImportSummary(rowCounts, "dry_run"),
        warningCount: result.warnings.length,
        errorCount: 0,
        ...rowCounts,
      },
    });
  }

  try {
    const store = createMeterStoreFromEnv();
    const summary = await commitCustomerIngest(store, tenantId, result);
    const locations = await store.listLocations(tenantId);
    const conflictCount = summary.addressConflicts?.length ?? 0;
    const friendlyParts = [
      formatRowImportSummary(
        { ...rowCounts, readingsWritten: summary.readingsWritten },
        "committed",
      ),
      `${summary.readingsWritten.toLocaleString("en-US")} readings written across ${locations.length} meters.`,
    ];
    if (conflictCount > 0) {
      friendlyParts.push(
        `${conflictCount} address conflict(s) kept on the existing meter location.`,
      );
    }
    return ok({
      tenantId,
      mapping: result.mapping,
      ...summary,
      ...rowCounts,
      metersTracked: locations.length,
      sheets: "sheets" in result ? result.sheets : undefined,
      selectedSheet:
        "selectedSheet" in result ? result.selectedSheet : undefined,
      mergedSheets: "mergedSheets" in result ? result.mergedSheets : undefined,
      // Prefer commit summary warnings (includes parse warnings + address/skip notes).
      warnings: summary.warnings,
      status: {
        phase: "committed",
        friendly: friendlyParts.join(" "),
        warningCount: summary.warnings.length,
        errorCount: 0,
        addressConflicts: conflictCount,
        ...rowCounts,
      },
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Ingest failed", {
      status: {
        phase: "failed",
        friendly:
          "We could not finish this import. Fix the message below and try again.",
        warningCount: result.warnings.length,
        errorCount: 1,
      },
    });
  }
};
