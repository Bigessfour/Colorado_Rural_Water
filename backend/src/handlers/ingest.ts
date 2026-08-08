import type { AuthedHandler } from "../shared/apigw.js";
import { parseAuthFromClaims, requireTenantId } from "../shared/auth.js";
import { formatRowImportSummary } from "../shared/csv-parse.js";
import {
  createIngestIdempotencyStoreFromEnv,
} from "../shared/dynamo-store.js";
import { INGEST_IDEMPOTENCY_TTL_SEC, SYNC_INGEST_MAX_ROWS } from "../shared/ingest-limits.js";
import {
  ingestRowCounts,
  runIngestCommit,
} from "../shared/ingest-run.js";
import {
  parseIngestContent,
  parseIngestRequestBody,
} from "../shared/ingest-request.js";
import {
  badRequest,
  forbidden,
  ok,
  payloadTooLarge,
  unauthorized,
} from "../shared/http.js";

/**
 * POST /ingest — parse customer CSV or Excel and write meter locations + readings.
 *
 * Sync commit is capped at SYNC_INGEST_MAX_ROWS (API Gateway ~30s). Larger files
 * should use POST /ingest/jobs (background worker).
 */
export const handler: AuthedHandler = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== "object") {
    return unauthorized();
  }

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

  const parsedBody = parseIngestRequestBody(event.body);
  if (parsedBody.error) {
    return badRequest(parsedBody.error);
  }
  const body = parsedBody.body;

  if (body.listSheets) {
    const content = parseIngestContent(body);
    if (content.error) return badRequest(content.error);
    return ok({
      tenantId,
      sheets: content.listSheets!.sheets,
      preferredSheet: content.listSheets!.preferredSheet,
    });
  }

  const content = parseIngestContent(body);
  if (content.error) return badRequest(content.error);
  const result = content.result!;

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

  const rowCounts = ingestRowCounts(result);

  if (body.dryRun) {
    return ok({
      dryRun: true,
      tenantId,
      mapping: result.mapping,
      rowCount: result.rows.length,
      syncMaxRows: SYNC_INGEST_MAX_ROWS,
      useBackgroundJob: result.rows.length > SYNC_INGEST_MAX_ROWS,
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

  if (result.rows.length > SYNC_INGEST_MAX_ROWS) {
    return payloadTooLarge(
      `This file has ${result.rows.length} rows — too many for a quick import (max ${SYNC_INGEST_MAX_ROWS}). Use background import instead.`,
      {
        rowCount: result.rows.length,
        syncMaxRows: SYNC_INGEST_MAX_ROWS,
        useBackgroundJob: true,
      },
    );
  }

  const idempotencyKey = body.idempotencyKey?.trim();
  if (idempotencyKey) {
    try {
      const idem = createIngestIdempotencyStoreFromEnv();
      const cached = await idem.get(tenantId, idempotencyKey);
      if (cached?.result) {
        return ok(cached.result);
      }
    } catch (idemErr) {
      console.warn(
        "ingest_idempotency_read_failed",
        idemErr instanceof Error ? idemErr.message : String(idemErr),
      );
    }
  }

  try {
    const responseBody = await runIngestCommit({
      tenantId,
      result,
      rowCounts,
      filename: body.filename,
    });

    if (idempotencyKey) {
      try {
        const idem = createIngestIdempotencyStoreFromEnv();
        await idem.put({
          tenantId,
          key: idempotencyKey,
          at: new Date().toISOString(),
          result: responseBody as unknown as Record<string, unknown>,
          expiresAt:
            Math.floor(Date.now() / 1000) + INGEST_IDEMPOTENCY_TTL_SEC,
        });
      } catch (idemErr) {
        console.warn(
          "ingest_idempotency_write_failed",
          idemErr instanceof Error ? idemErr.message : String(idemErr),
        );
      }
    }

    return ok(responseBody);
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
