import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Event } from 'aws-lambda';
import { parseCustomerReadingsCsv } from '../shared/csv-parse.js';
import { createMeterStoreFromEnv } from '../shared/dynamo-store.js';
import { commitCustomerIngest } from '../shared/ingest.js';

const s3 = new S3Client({});

/**
 * S3 ObjectCreated handler for tenant drop-zone uploads.
 * Key format: tenants/{tenantId}/uploads/...
 */
export const handler = async (event: S3Event): Promise<{ ok: true; results: unknown[] }> => {
  const store = createMeterStoreFromEnv();
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
    const csvText = await obj.Body?.transformToString('utf-8');
    if (!csvText) {
      results.push({ key, error: 'Empty object' });
      continue;
    }

    const savedMapping = await store.getMapping(tenantId, 'customer_readings');
    const parsed = parseCustomerReadingsCsv(
      csvText,
      savedMapping ? (savedMapping as never) : undefined,
    );
    if (parsed.errors.length) {
      results.push({ key, tenantId, errors: parsed.errors, warnings: parsed.warnings });
      continue;
    }

    const summary = await commitCustomerIngest(store, tenantId, parsed);
    results.push({ key, tenantId, ...summary });
  }

  return { ok: true, results };
};

function tenantFromKey(key: string): string | null {
  const parts = key.split('/');
  if (parts[0] !== 'tenants' || parts[2] !== 'uploads' || !parts[1]) return null;
  return parts[1];
}
