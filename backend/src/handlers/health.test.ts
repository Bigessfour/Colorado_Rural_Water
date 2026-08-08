import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handler } from './health.js';

describe('GET /health', () => {
  it('returns ok payload', async () => {
    const res = await handler({} as never, {} as never, () => undefined);
    assert.ok(res && typeof res === 'object' && 'statusCode' in res);
    assert.equal((res as { statusCode: number }).statusCode, 200);
    const body = JSON.parse((res as { body: string }).body);
    assert.equal(body.service, 'water-saver');
    assert.equal(body.status, 'ok');
    assert.ok(typeof body.timestamp === 'string');
  });
});
