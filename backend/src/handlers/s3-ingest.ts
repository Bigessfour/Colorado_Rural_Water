import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { S3Event } from "aws-lambda";
import {
  MAX_CSV_CHARS,
  parseCustomerReadingsCsv,
} from "../shared/csv-parse.js";
import {
  assertExcelBufferWithinLimit,
  isExcelFileName,
  looksLikeExcelBuffer,
  parseCustomerReadingsExcel,
} from "../shared/excel-parse.js";
import {
  createLastIngestStoreFromEnv,
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from "../shared/dynamo-store.js";
import { commitCustomerIngest } from "../shared/ingest.js";
import type { MeterStore } from "../shared/ingest.js";
import { buildLastIngestRecord } from "../shared/last-ingest.js";
import { parseSourceReadingsCsv } from "../shared/source-csv-parse.js";
import { commitSourceIngest } from "../shared/source-ingest.js";
import type { SourceStore } from "../shared/source-store.js";

const s3 = new S3Client({});

/** Tenant slug shape — reject path traversal / junk segments from object keys. */
const TENANT_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export type S3IngestDeps = {
  getObjectBytes: (bucket: string, key: string) => Promise<Buffer>;
  createMeterStore: () => MeterStore;
  createSourceStore: () => SourceStore;
};

/**
 * S3 ObjectCreated handler for tenant drop-zone uploads.
 * Tenant is taken from the object key prefix — not from object metadata or the client body.
 * Key format:
 *   tenants/{tenantId}/uploads/...          → customer readings (CSV or Excel)
 *   tenants/{tenantId}/uploads/sources/...  → source / well readings (G2)
 */
export const handler = async (
  event: S3Event,
): Promise<{ ok: true; results: unknown[] }> => {
  return handleS3IngestEvent(event, {
    getObjectBytes: async (bucket, key) => {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const bytes = await obj.Body?.transformToByteArray();
      if (!bytes?.length) return Buffer.alloc(0);
      return Buffer.from(bytes);
    },
    createMeterStore: createMeterStoreFromEnv,
    createSourceStore: createSourceStoreFromEnv,
  });
};

/** Injectable entry for unit tests (memory stores + in-memory object bytes). */
export async function handleS3IngestEvent(
  event: S3Event,
  deps: S3IngestDeps,
): Promise<{ ok: true; results: unknown[] }> {
  const results = [];

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    let key: string;
    try {
      key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    } catch {
      results.push({
        key: record.s3.object.key,
        error: "Object key has invalid percent-encoding",
      });
      continue;
    }
    const tenantId = tenantFromKey(key);
    if (!tenantId) {
      results.push({
        key,
        error: "Object key is not under tenants/{tenantId}/uploads/",
      });
      continue;
    }

    const buf = await deps.getObjectBytes(bucket, key);
    if (!buf.length) {
      results.push({ key, error: "Empty object" });
      continue;
    }

    const result = await processS3UploadObject({
      key,
      tenantId,
      buf,
      meterStore: deps.createMeterStore(),
      sourceStore: deps.createSourceStore(),
    });
    results.push(result);
  }

  return { ok: true, results };
}

/** Parse + commit one uploaded object (customer or source). Exported for focused tests. */
export async function processS3UploadObject(input: {
  key: string;
  tenantId: string;
  buf: Buffer;
  meterStore: MeterStore;
  sourceStore: SourceStore;
}): Promise<Record<string, unknown>> {
  const { key, tenantId, buf, meterStore, sourceStore } = input;

  if (isSourceUploadKey(key)) {
    if (buf.length > MAX_CSV_CHARS) {
      return {
        key,
        tenantId,
        kind: "source",
        error: `Source CSV too large (${buf.length} bytes; max ${MAX_CSV_CHARS})`,
      };
    }
    const csvText = buf.toString("utf-8");
    const savedMapping = await sourceStore.getMapping(
      tenantId,
      "source_readings",
    );
    const parsed = parseSourceReadingsCsv(
      csvText,
      savedMapping ? (savedMapping as never) : undefined,
    );
    if (parsed.errors.length) {
      return {
        key,
        tenantId,
        kind: "source",
        errors: parsed.errors,
        warnings: parsed.warnings,
      };
    }
    const summary = await commitSourceIngest(sourceStore, tenantId, parsed);
    return { key, tenantId, kind: "source", ...summary };
  }

  const savedMapping = await meterStore.getMapping(
    tenantId,
    "customer_readings",
  );
  const mapping = savedMapping ? (savedMapping as never) : undefined;

  const namedExcel = isExcelFileName(key);
  const magicExcel = looksLikeExcelBuffer(buf);
  if (namedExcel && !magicExcel) {
    return {
      key,
      tenantId,
      kind: "customer",
      format: "excel",
      error:
        "File extension looks like Excel but content is not a recognizable workbook.",
    };
  }
  const useExcel = namedExcel || magicExcel;
  if (useExcel) {
    try {
      assertExcelBufferWithinLimit(buf);
    } catch (err) {
      return {
        key,
        tenantId,
        kind: "customer",
        format: "excel",
        error: err instanceof Error ? err.message : "Excel too large",
      };
    }
  } else if (buf.length > MAX_CSV_CHARS) {
    return {
      key,
      tenantId,
      kind: "customer",
      format: "csv",
      error: `CSV too large (${buf.length} bytes; max ${MAX_CSV_CHARS})`,
    };
  }

  let parsed;
  try {
    parsed = useExcel
      ? parseCustomerReadingsExcel(buf, { mergeArchive: true, mapping })
      : parseCustomerReadingsCsv(buf.toString("utf-8"), mapping);
  } catch (err) {
    return {
      key,
      tenantId,
      kind: "customer",
      format: useExcel ? "excel" : "csv",
      error: err instanceof Error ? err.message : "Parse failed",
    };
  }

  if (parsed.errors.length) {
    return {
      key,
      tenantId,
      kind: "customer",
      format: useExcel ? "excel" : "csv",
      errors: parsed.errors,
      warnings: parsed.warnings,
    };
  }

  const summary = await commitCustomerIngest(meterStore, tenantId, parsed);
  try {
    await createLastIngestStoreFromEnv().putLastIngest(
      buildLastIngestRecord({
        tenantId,
        rowsAccepted: parsed.rowsAccepted,
        rowsSkipped: parsed.rowsSkipped,
        readingsWritten: summary.readingsWritten,
        filename: key.split("/").pop() ?? key,
      }),
    );
  } catch (metaErr) {
    console.warn(
      "last_ingest_persist_failed",
      metaErr instanceof Error ? metaErr.message : String(metaErr),
    );
  }
  return {
    key,
    tenantId,
    kind: "customer",
    format: useExcel ? "excel" : "csv",
    selectedSheet: "selectedSheet" in parsed ? parsed.selectedSheet : undefined,
    mergedSheets: "mergedSheets" in parsed ? parsed.mergedSheets : undefined,
    ...summary,
  };
}

export function tenantFromKey(key: string): string | null {
  // Reject absolute / traversal-ish keys before splitting.
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("\0"))
    return null;
  const parts = key.split("/");
  if (parts[0] !== "tenants" || parts[2] !== "uploads" || !parts[1])
    return null;
  const tenantId = parts[1].toLowerCase();
  if (tenantId.includes("..") || !TENANT_ID_RE.test(tenantId)) return null;
  // Ensure no empty path segments in the uploads prefix (path traversal via //).
  if (parts.some((p, i) => i > 0 && p === "")) return null;
  return tenantId;
}

/** tenants/{tenantId}/uploads/sources/... */
function isSourceUploadKey(key: string): boolean {
  const parts = key.split("/");
  return (
    parts[0] === "tenants" && parts[2] === "uploads" && parts[3] === "sources"
  );
}
