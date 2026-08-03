import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MemoryAlertStatusStore,
  applyAlertStatuses,
  isAlertStatusAction,
  resolveAlertActionTarget,
  sanitizeAlertId,
  statusFromAction,
  type AlertStatusRecord,
} from './alert-status.js';

describe('alert-status helpers', () => {
  it('validates actions', () => {
    assert.equal(isAlertStatusAction('acknowledge'), true);
    assert.equal(isAlertStatusAction('accept'), true);
    assert.equal(isAlertStatusAction('dispatch'), true);
    assert.equal(isAlertStatusAction('resolve'), true);
    assert.equal(isAlertStatusAction('snooze'), false);
  });

  it('maps action to status', () => {
    assert.equal(statusFromAction('acknowledge'), 'acknowledged');
    assert.equal(statusFromAction('accept'), 'acknowledged');
    assert.equal(statusFromAction('dispatch'), 'dispatched');
    assert.equal(statusFromAction('resolve'), 'resolved');
  });

  it('sanitizes alertId', () => {
    assert.equal(sanitizeAlertId(' stuck-m1-2026-07-01T00:00:00.000Z '), 'stuck-m1-2026-07-01T00:00:00.000Z');
    assert.throws(() => sanitizeAlertId(''), /1–200/);
    assert.throws(() => sanitizeAlertId('bad\nid'), /invalid/);
  });

  it('resolveAlertActionTarget ignores forged meter ids by using evaluated alerts only', () => {
    const meter = resolveAlertActionTarget(
      'stuck-1042',
      [{ id: 'stuck-1042', meterId: '1042', summary: 'Stuck' }],
      [{ id: 'bal-1', summary: 'High loss' }],
    );
    assert.deepEqual(meter, { kind: 'meter', meterId: '1042', summary: 'Stuck' });

    const balance = resolveAlertActionTarget(
      'bal-1',
      [{ id: 'stuck-1042', meterId: '1042', summary: 'Stuck' }],
      [{ id: 'bal-1', summary: 'High loss' }],
    );
    assert.deepEqual(balance, { kind: 'balance', meterId: null, summary: 'High loss' });

    assert.equal(
      resolveAlertActionTarget('missing', [{ id: 'stuck-1042', meterId: '1042', summary: 'Stuck' }], []),
      null,
    );
  });
});

describe('applyAlertStatuses', () => {
  const statuses: AlertStatusRecord[] = [
    {
      tenantId: 't1',
      alertId: 'a1',
      status: 'acknowledged',
      actorUserId: 'u1',
      actorEmail: 'op@example.com',
      updatedAt: '2026-08-01T12:00:00.000Z',
      note: 'Looking into it',
      meterId: '1042',
      summary: 'High usage',
    },
    {
      tenantId: 't1',
      alertId: 'a2',
      status: 'resolved',
      actorUserId: 'u2',
      actorEmail: 'admin@example.com',
      updatedAt: '2026-08-02T12:00:00.000Z',
      note: 'Replaced meter',
      meterId: '1043',
      summary: 'Stuck',
    },
    {
      tenantId: 't1',
      alertId: 'a4',
      status: 'dispatched',
      actorUserId: 'u1',
      actorEmail: 'op@example.com',
      updatedAt: '2026-08-03T12:00:00.000Z',
      note: 'Crew en route',
      meterId: '1042',
      summary: 'Leak flag',
    },
  ];

  it('marks acknowledged/dispatched and drops resolved by default', () => {
    const merged = applyAlertStatuses(
      [{ id: 'a1', summary: 'one' }, { id: 'a2', summary: 'two' }, { id: 'a3', summary: 'three' }, { id: 'a4', summary: 'four' }],
      statuses,
    );
    assert.equal(merged.length, 3);
    assert.equal(merged[0]!.status, 'acknowledged');
    assert.equal(merged[0]!.actionNote, 'Looking into it');
    assert.equal(merged[1]!.status, 'open');
    assert.equal(merged[2]!.status, 'dispatched');
  });

  it('can include resolved', () => {
    const merged = applyAlertStatuses([{ id: 'a2', summary: 'two' }], statuses, {
      includeResolved: true,
    });
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.status, 'resolved');
  });
});

describe('MemoryAlertStatusStore activity', () => {
  it('records status and meter activity timeline', async () => {
    const store = new MemoryAlertStatusStore();
    await store.putAlertStatus({
      tenantId: 't1',
      alertId: 'stuck-1042-1',
      status: 'dispatched',
      actorUserId: 'u1',
      actorEmail: 'op@example.com',
      updatedAt: '2026-08-03T12:00:00.000Z',
      note: 'Dispatched',
      meterId: '1042',
      summary: 'Stuck meter',
    });
    await store.putAlertActivity({
      tenantId: 't1',
      eventId: 'e1',
      alertId: 'stuck-1042-1',
      meterId: '1042',
      action: 'dispatch',
      status: 'dispatched',
      actorUserId: 'u1',
      actorEmail: 'op@example.com',
      note: 'Dispatched',
      summary: 'Stuck meter',
      createdAt: '2026-08-03T12:00:00.000Z',
    });
    await store.putAlertActivity({
      tenantId: 't1',
      eventId: 'e0',
      alertId: 'stuck-1042-1',
      meterId: '1042',
      action: 'accept',
      status: 'acknowledged',
      actorUserId: 'u1',
      actorEmail: 'op@example.com',
      note: null,
      summary: 'Stuck meter',
      createdAt: '2026-08-03T11:00:00.000Z',
    });

    const hist = await store.listAlertActivityForMeter('t1', '1042');
    assert.equal(hist.length, 2);
    assert.equal(hist[0]!.action, 'dispatch');
    assert.equal(hist[1]!.action, 'accept');
  });
});
