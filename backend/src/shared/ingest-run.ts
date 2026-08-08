import { formatRowImportSummary, type IngestParseResult } from "./csv-parse.js";
import {
  createLastIngestStoreFromEnv,
  createMeterStoreFromEnv,
} from "./dynamo-store.js";
import { refreshTenantConfidence } from "./confidence-refresh.js";
import { commitCustomerIngest, type IngestCommitSummary } from "./ingest.js";
import { buildLastIngestRecord, type LastIngestRecord } from "./last-ingest.js";

export interface IngestRowCounts {
  rowsSeen: number;
  rowsAccepted: number;
  rowsSkipped: number;
  rowsDeduped: number;
}

export interface IngestCommitPayload {
  tenantId: string;
  result: IngestParseResult;
  rowCounts: IngestRowCounts;
  filename?: string | null;
}

export interface IngestCommitResponseBody {
  tenantId: string;
  mapping: IngestParseResult["mapping"];
  locationsUpserted: number;
  readingsWritten: number;
  metersTracked: number;
  addressConflicts: IngestCommitSummary["addressConflicts"];
  warnings: string[];
  rowsSeen: number;
  rowsAccepted: number;
  rowsSkipped: number;
  rowsDeduped: number;
  lastIngest: LastIngestRecord;
  sheets?: unknown;
  selectedSheet?: unknown;
  mergedSheets?: unknown;
  status: {
    phase: "committed";
    friendly: string;
    warningCount: number;
    errorCount: number;
    addressConflicts: number;
    rowsSeen: number;
    rowsAccepted: number;
    rowsSkipped: number;
    rowsDeduped: number;
    readingsWritten?: number;
  };
}

export function ingestRowCounts(result: IngestParseResult): IngestRowCounts {
  return {
    rowsSeen: result.rowsSeen,
    rowsAccepted: result.rowsAccepted,
    rowsSkipped: result.rowsSkipped,
    rowsDeduped: result.rowsDeduped ?? 0,
  };
}

export async function runIngestCommit(
  input: IngestCommitPayload,
): Promise<IngestCommitResponseBody> {
  const store = createMeterStoreFromEnv();
  const summary = await commitCustomerIngest(store, input.tenantId, input.result);
  const lastIngest = buildLastIngestRecord({
    tenantId: input.tenantId,
    rowsAccepted: input.rowCounts.rowsAccepted,
    rowsSkipped: input.rowCounts.rowsSkipped,
    readingsWritten: summary.readingsWritten,
    filename: input.filename,
  });
  try {
    await createLastIngestStoreFromEnv().putLastIngest(lastIngest);
  } catch (metaErr) {
    console.warn(
      "last_ingest_persist_failed",
      metaErr instanceof Error ? metaErr.message : String(metaErr),
    );
  }
  try {
    await refreshTenantConfidence(input.tenantId);
  } catch (confErr) {
    console.warn(
      "confidence_refresh_failed",
      confErr instanceof Error ? confErr.message : String(confErr),
    );
  }
  return buildIngestCommitResponse({
    tenantId: input.tenantId,
    result: input.result,
    summary,
    rowCounts: input.rowCounts,
    lastIngest,
  });
}

export function buildIngestCommitResponse(input: {
  tenantId: string;
  result: IngestParseResult;
  summary: IngestCommitSummary;
  rowCounts: IngestRowCounts;
  lastIngest: LastIngestRecord;
}): IngestCommitResponseBody {
  const conflictCount = input.summary.addressConflicts?.length ?? 0;
  const friendlyParts = [
    formatRowImportSummary(
      { ...input.rowCounts, readingsWritten: input.summary.readingsWritten },
      "committed",
    ),
    `${input.summary.readingsWritten.toLocaleString("en-US")} readings written across ${input.summary.metersTracked} meters.`,
  ];
  if (conflictCount > 0) {
    friendlyParts.push(
      `${conflictCount} address conflict(s) kept on the existing meter location.`,
    );
  }
  return {
    tenantId: input.tenantId,
    mapping: input.result.mapping,
    locationsUpserted: input.summary.locationsUpserted,
    readingsWritten: input.summary.readingsWritten,
    metersTracked: input.summary.metersTracked,
    addressConflicts: input.summary.addressConflicts,
    warnings: input.summary.warnings,
    ...input.rowCounts,
    lastIngest: input.lastIngest,
    sheets: "sheets" in input.result ? input.result.sheets : undefined,
    selectedSheet:
      "selectedSheet" in input.result ? input.result.selectedSheet : undefined,
    mergedSheets:
      "mergedSheets" in input.result ? input.result.mergedSheets : undefined,
    status: {
      phase: "committed",
      friendly: friendlyParts.join(" "),
      warningCount: input.summary.warnings.length,
      errorCount: 0,
      addressConflicts: conflictCount,
      ...input.rowCounts,
      readingsWritten: input.summary.readingsWritten,
    },
  };
}
