import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { S3Event } from 'aws-lambda';
import { MemoryMeterStore } from '../shared/memory-store.js';
import { MemorySourceStore } from '../shared/source-store.js';
import { handleS3IngestEvent, tenantFromKey } from './s3-ingest.js';

const SAMPLE_CSV = `Meter ID,Read Date,Reading (gal),Account #,Customer,Service Address,Route,Diag
1042,07/15/2026,128450,A-2201,A Rivera,112 N Main St Wiley CO,R3,
1042,06/15/2026,125100,A-2201,J Smith,112 N Main St Wiley CO,R3,
`;

function s3Event(key: string): S3Event {
  return {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-east-2',
        eventTime: '2026-08-03T00:00:00.000Z',
        eventName: 'ObjectCreated:Put',
        userIdentity: { principalId: 'test' },
        requestParameters: { sourceIPAddress: '127.0.0.1' },
        responseElements: {
          'x-amz-request-id': 'req',
          'x-amz-id-2': 'id2',
        },
        s3: {
          s3SchemaVersion: '1.0',
          configurationId: 'cfg',
          bucket: {
            name: 'water-saver-dev-uploads',
            ownerIdentity: { principalId: 'owner' },
            arn: 'arn:aws:s3:::water-saver-dev-uploads',
          },
          object: {
            key,
            size: SAMPLE_CSV.length,
            eTag: 'etag',
            sequencer: '0',
          },
        },
      },
    ],
  };
}

describe('tenantFromKey', () => {
  it('extracts tenant from canonical upload keys', () => {
    assert.equal(tenantFromKey('tenants/town-wiley/uploads/file.xlsx'), 'town-wiley');
    assert.equal(tenantFromKey('tenants/Town-Wiley/uploads/sources/a.csv'), 'town-wiley');
  });

  it('rejects path traversal and invalid tenant segments', () => {
    assert.equal(tenantFromKey('tenants/../uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants/evil/../uploads/x.csv'), null);
    assert.equal(tenantFromKey('/tenants/town-wiley/uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants/town_wiley/uploads/x.csv'), null);
    assert.equal(tenantFromKey('tenants//uploads/x.csv'), null);
    assert.equal(tenantFromKey('not-tenants/town-wiley/uploads/x.csv'), null);
  });
});

describe('handleS3IngestEvent (memory stores)', () => {
  it('parses customer CSV and commits locations + readings for JWT tenant path', async () => {
    const meterStore = new MemoryMeterStore();
    const sourceStore = new MemorySourceStore();
    const key = 'tenants/town-demo/uploads/messy-readings-july.csv';

    const out = await handleS3IngestEvent(s3Event(key), {
      getObjectBytes: async () => Buffer.from(SAMPLE_CSV, 'utf-8'),
      createMeterStore: () => meterStore,
      createSourceStore: () => sourceStore,
    });

    assert.equal(out.ok, true);
    assert.equal(out.results.length, 1);
    const row = out.results[0] as {
      tenantId: string;
      kind: string;
      format: string;
      error?: string;
    };
    assert.equal(row.tenantId, 'town-demo');
    assert.equal(row.kind, 'customer');
    assert.equal(row.format, 'csv');
    assert.equal(row.error, undefined);

    const locations = await meterStore.listLocations('town-demo');
    const readings = await meterStore.listReadings('town-demo');
    assert.ok(locations.some((l) => l.meterId === '1042'));
    assert.ok(readings.length >= 1);
    assert.equal((await meterStore.listLocations('other-town')).length, 0);
  });

  it('rejects keys outside tenants/{id}/uploads/', async () => {
    const out = await handleS3IngestEvent(s3Event('public/leak.csv'), {
      getObjectBytes: async () => Buffer.from(SAMPLE_CSV, 'utf-8'),
      createMeterStore: () => new MemoryMeterStore(),
      createSourceStore: () => new MemorySourceStore(),
    });
    const row = out.results[0] as { error?: string };
    assert.match(row.error ?? '', /not under tenants/);
  });
});
