import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './ingest-worker.js';

describe('ingest-worker handler', () => {
  it('returns without throwing when tenantId or jobId is missing', async () => {
    await assert.doesNotReject(async () => {
      await handler({ tenantId: '', jobId: 'job-1' });
      await handler({ tenantId: 'town-wiley', jobId: '' });
      await handler({} as never);
    });
  });
});
