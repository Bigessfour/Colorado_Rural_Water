import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Event } from 'aws-lambda';
import { MAX_CSV_CHARS, parseCustomerReadingsCsv } from '../shared/csv-parse.js';
import {
  assertExcelBufferWithinLimit,
  isExcelFileName,
  looksLikeExcelBuffer,
  parseCustomerReadingsExcel,
} from '../shared/excel-parse.js';
import {
  createMeterStoreFromEnv,
  createSourceStoreFromEnv,
} from '../shared/dynamo-store.js';
import { commitCustomerIngest } from '../shared/ingest.js';
import { parseSourceReadingsCsv } from '../shared/source-csv-parse.js';
import { commitSourceIngest } from '../shared/source-ingest.js';

const s3 = new S3Client({});

/** Tenant slug shape — reject path traversal / junk segments from object keys. */
const TENANT_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

/**
 * S3 ObjectCreated handler for tenant drop-zone uploads.
 * Key format:
 *   tenants/{tenantId}/uploads/...          → customer readings (CSV or Excel)
 *   tenants/{tenantId}/uploads/sources/...  → source / well readings (G2)
 */
export const handler = async (event: S3Event): Promise<{ ok: true; results: unknown[] }> => {
  const results = [];

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    let key: string;
    try {
      key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    } catch {
      results.push({
        key: record.s3.object.key,
        error: 'Object key has invalid percent-encoding',
      });
      continue;
    }
    const tenantId = tenantFromKey(key);
    if (!tenantId) {
      results.push({ key, error: 'Object key is not under tenants/{tenantId}/uploads/' });
      continue;
    }

    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes?.length) {
      results.push({ key, error: 'Empty object' });
      continue;
    }
    const buf = Buffer.from(bytes);

    if (isSourceUploadKey(key)) {
      if (buf.length > MAX_CSV_CHARS) {
        results.push({
          key,
          tenantId,
          kind: 'source',
          error: `Source CSV too large (${buf.length} bytes; max ${MAX_CSV_CHARS})`,
        });
        continue;
      }
      const csvText = buf.toString('utf-8');
      const sourceStore = createSourceStoreFromEnv();
      const savedMapping = await sourceStore.getMapping(tenantId, 'source_readings');
      const parsed = parseSourceReadingsCsv(
        csvText,
        savedMapping ? (savedMapping as never) : undefined,
      );
      if (parsed.errors.length) {
        results.push({ key, tenantId, kind: 'source', errors: parsed.errors, warnings: parsed.warnings });
        continue;
      }
      const summary = await commitSourceIngest(sourceStore, tenantId, parsed);
      results.push({ key, tenantId, kind: 'source', ...summary });
      continue;
    }

    const store = createMeterStoreFromEnv();
    const savedMapping = await store.getMapping(tenantId, 'customer_readings');
    const mapping = savedMapping ? (savedMapping as never) : undefined;

    // Extension preferred; magic alone only when OOXML markers present (not any ZIP).
    const namedExcel = isExcelFileName(key);
    const magicExcel = looksLikeExcelBuffer(buf);
    if (namedExcel && !magicExcel) {
      results.push({
        key,
        tenantId,
        kind: 'customer',
        format: 'excel',
        error: 'File extension looks like Excel but content is not a recognizable workbook.',
      });
      continue;
    }
    const useExcel = namedExcel || magicExcel;
    if (useExcel) {
      try {
        assertExcelBufferWithinLimit(buf);
      } catch (err) {
        results.push({
          key,
          tenantId,
          kind: 'customer',
          format: 'excel',
          error: err instanceof Error ? err.message : 'Excel too large',
        });
        continue;
      }
    } else if (buf.length > MAX_CSV_CHARS) {
      results.push({
        key,
        tenantId,
        kind: 'customer',
        format: 'csv',
        error: `CSV too large (${buf.length} bytes; max ${MAX_CSV_CHARS})`,
      });
      continue;
    }

    let parsed;
    try {
      parsed = useExcel
        ? parseCustomerReadingsExcel(buf, { mergeArchive: true, mapping })
        : parseCustomerReadingsCsv(buf.toString('utf-8'), mapping);
    } catch (err) {
      results.push({
        key,
        tenantId,
        kind: 'customer',
        format: useExcel ? 'excel' : 'csv',
        error: err instanceof Error ? err.message : 'Parse failed',
      });
      continue;
    }

    if (parsed.errors.length) {
      results.push({
        key,
        tenantId,
        kind: 'customer',
        format: useExcel ? 'excel' : 'csv',
        errors: parsed.errors,
        warnings: parsed.warnings,
      });
      continue;
    }

    const summary = await commitCustomerIngest(store, tenantId, parsed);
    results.push({
      key,
      tenantId,
      kind: 'customer',
      format: useExcel ? 'excel' : 'csv',
      selectedSheet: 'selectedSheet' in parsed ? parsed.selectedSheet : undefined,
      mergedSheets: 'mergedSheets' in parsed ? parsed.mergedSheets : undefined,
      ...summary,
    });
  }

  return { ok: true, results };
};

export function tenantFromKey(key: string): string | null {
  // Reject absolute / traversal-ish keys before splitting.
  if (!key || key.startsWith('/') || key.includes('\\') || key.includes('\0')) return null;
  const parts = key.split('/');
  if (parts[0] !== 'tenants' || parts[2] !== 'uploads' || !parts[1]) return null;
  const tenantId = parts[1].toLowerCase();
  if (tenantId.includes('..') || !TENANT_ID_RE.test(tenantId)) return null;
  // Ensure no empty path segments in the uploads prefix (path traversal via //).
  if (parts.some((p, i) => i > 0 && p === '')) return null;
  return tenantId;
}

/** tenants/{tenantId}/uploads/sources/... */
function isSourceUploadKey(key: string): boolean {
  const parts = key.split('/');
  return parts[0] === 'tenants' && parts[2] === 'uploads' && parts[3] === 'sources';
}
