import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler, ingestJobPayloadKey } from './ingest-jobs.js';
import { authedEvent, statusOf } from './_test-event.js';

const PRACTICE_CSV = [
  'account_id,service_address,meter_id,reading,reading_date',
  'A1,100 Main St,M-1,1000,2026-07-01',
].join('\n');

describe('ingestJobPayloadKey', () => {
  it('scopes S3 keys under tenant prefix', () => {
    assert.equal(
      ingestJobPayloadKey('town-wiley', 'job-1'),
      'tenants/town-wiley/ingest-jobs/job-1.json',
    );
  });
});

describe('POST /ingest/jobs', () => {
  it('returns 401 without JWT claims', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/jobs',
        claims: null,
        body: JSON.stringify({ csvText: PRACTICE_CSV }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 401);
  });

  it('returns 403 when tenant_id claim is missing', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/jobs',
        claims: {
          sub: 'u1',
          email: 'x@y.z',
          'cognito:groups': 'operators',
        },
        body: JSON.stringify({ csvText: PRACTICE_CSV }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 403);
  });

  it('rejects missing body', async () => {
    const res = await handler(
      authedEvent({ method: 'POST', path: '/ingest/jobs' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });

  it('rejects dryRun on background jobs', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/jobs',
        body: JSON.stringify({ csvText: PRACTICE_CSV, dryRun: true }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
    const body = JSON.parse((res as { body: string }).body);
    assert.match(body.error ?? '', /dryRun is not supported/i);
  });

  it('rejects listSheets on background jobs', async () => {
    const res = await handler(
      authedEvent({
        method: 'POST',
        path: '/ingest/jobs',
        body: JSON.stringify({ excelBase64: 'AAAA', listSheets: true }),
      }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
    const body = JSON.parse((res as { body: string }).body);
    assert.match(body.error ?? '', /listSheets is not supported/i);
  });

  it('returns 400 when UPLOAD_BUCKET is not configured', async () => {
    const prevBucket = process.env.UPLOAD_BUCKET;
    const prevWorker = process.env.INGEST_WORKER_FUNCTION;
    delete process.env.UPLOAD_BUCKET;
    delete process.env.INGEST_WORKER_FUNCTION;
    try {
      const res = await handler(
        authedEvent({
          method: 'POST',
          path: '/ingest/jobs',
          body: JSON.stringify({ csvText: PRACTICE_CSV }),
        }),
        {} as never,
        () => undefined,
      );
      assert.equal(statusOf(res), 400);
      const body = JSON.parse((res as { body: string }).body);
      assert.match(body.error ?? '', /UPLOAD_BUCKET/i);
    } finally {
      if (prevBucket !== undefined) process.env.UPLOAD_BUCKET = prevBucket;
      if (prevWorker !== undefined) process.env.INGEST_WORKER_FUNCTION = prevWorker;
    }
  });
});

describe('GET /ingest/jobs/{jobId}', () => {
  it('returns 400 for unknown route', async () => {
    const res = await handler(
      authedEvent({ method: 'GET', path: '/ingest/jobs' }),
      {} as never,
      () => undefined,
    );
    assert.equal(statusOf(res), 400);
  });
});
