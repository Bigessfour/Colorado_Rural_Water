import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Event } from 'aws-lambda';
import { parseCustomerReadingsCsv } from '../shared/csv-parse.js';
import {
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
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
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

    const useExcel = isExcelFileName(key) || looksLikeExcelBuffer(buf);
    const parsed = useExcel
      ? parseCustomerReadingsExcel(buf, { mergeArchive: true, mapping })
      : parseCustomerReadingsCsv(buf.toString('utf-8'), mapping);

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

function tenantFromKey(key: string): string | null {
  const parts = key.split('/');
  if (parts[0] !== 'tenants' || parts[2] !== 'uploads' || !parts[1]) return null;
  return parts[1];
}

/** tenants/{tenantId}/uploads/sources/... */
function isSourceUploadKey(key: string): boolean {
  const parts = key.split('/');
  return parts[0] === 'tenants' && parts[2] === 'uploads' && parts[3] === 'sources';
}
