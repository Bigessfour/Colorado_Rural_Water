import {
  MAX_CSV_CHARS,
  parseCustomerReadingsCsv,
  type ColumnMapping,
} from "./csv-parse.js";
import {
  MAX_EXCEL_BASE64_CHARS,
  MAX_EXCEL_BYTES,
  bufferFromBase64,
  listWorkbookSheets,
  looksLikeExcelBuffer,
  parseCustomerReadingsExcel,
} from "./excel-parse.js";
import type { IngestParseResult } from "./csv-parse.js";

/** Stay under API Gateway HTTP API ~10 MiB payload; leave headroom for JSON wrappers. */
export const MAX_INGEST_BODY_CHARS = 8 * 1024 * 1024;

export interface IngestRequestBody {
  csvText?: string;
  excelBase64?: string;
  sheetName?: string;
  mergeArchive?: boolean;
  listSheets?: boolean;
  mapping?: ColumnMapping;
  dryRun?: boolean;
  idempotencyKey?: string;
  filename?: string;
}

export function parseIngestRequestBody(raw: string): {
  body: IngestRequestBody;
  error?: string;
} {
  if (raw.length > MAX_INGEST_BODY_CHARS) {
    return {
      body: {},
      error: `Request body is too large (max ${MAX_INGEST_BODY_CHARS} characters). Use a smaller file or background import.`,
    };
  }
  try {
    const parsed = JSON.parse(raw) as IngestRequestBody;
    if (parsed.excelBase64 != null && typeof parsed.excelBase64 !== "string") {
      return { body: {}, error: "excelBase64 must be a string" };
    }
    if (parsed.csvText != null && typeof parsed.csvText !== "string") {
      return { body: {}, error: "csvText must be a string" };
    }
    if (parsed.excelBase64 && parsed.excelBase64.length > MAX_EXCEL_BASE64_CHARS) {
      return {
        body: {},
        error: `excelBase64 is too large (max ~${MAX_EXCEL_BYTES} bytes decoded). Use background import.`,
      };
    }
    if (parsed.csvText && parsed.csvText.length > MAX_CSV_CHARS) {
      return {
        body: {},
        error: `csvText is too large (max ${MAX_CSV_CHARS} characters). Use background import.`,
      };
    }
    return { body: parsed };
  } catch {
    return { body: {}, error: "Body must be JSON" };
  }
}

export function parseIngestContent(body: IngestRequestBody): {
  result?: IngestParseResult;
  error?: string;
  listSheets?: { sheets: unknown; preferredSheet: string | null };
} {
  if (body.listSheets) {
    if (!body.excelBase64?.trim()) {
      return { error: "excelBase64 is required when listSheets is true" };
    }
    try {
      const buf = bufferFromBase64(body.excelBase64);
      if (!looksLikeExcelBuffer(buf)) {
        return {
          error: "excelBase64 does not look like an Excel file (.xlsx / .xls)",
        };
      }
      const sheets = listWorkbookSheets(buf);
      return {
        listSheets: {
          sheets,
          preferredSheet:
            sheets.find((s) => s.preferred && !s.archive)?.name ?? null,
        },
      };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Could not read Excel workbook",
      };
    }
  }

  const hasCsv = Boolean(body.csvText?.trim());
  const hasExcel = Boolean(body.excelBase64?.trim());
  if (!hasCsv && !hasExcel) {
    return { error: "csvText or excelBase64 is required" };
  }

  try {
    if (hasExcel) {
      const buf = bufferFromBase64(body.excelBase64!);
      if (!looksLikeExcelBuffer(buf)) {
        return {
          error: "excelBase64 does not look like an Excel file (.xlsx / .xls)",
        };
      }
      return {
        result: parseCustomerReadingsExcel(buf, {
          sheetName: body.sheetName,
          mergeArchive: Boolean(body.mergeArchive),
          mapping: body.mapping,
        }),
      };
    }
    return {
      result: parseCustomerReadingsCsv(body.csvText!, body.mapping),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Parse failed" };
  }
}
