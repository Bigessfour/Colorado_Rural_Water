import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyAlertStatuses,
  isAlertStatusAction,
  sanitizeAlertId,
  statusFromAction,
  type AlertStatusRecord,
} from './alert-status.js';

describe('alert-status helpers', () => {
  it('validates actions', () => {
    assert.equal(isAlertStatusAction('acknowledge'), true);
    assert.equal(isAlertStatusAction('resolve'), true);
    assert.equal(isAlertStatusAction('snooze'), false);
  });

  it('maps action to status', () => {
    assert.equal(statusFromAction('acknowledge'), 'acknowledged');
    assert.equal(statusFromAction('resolve'), 'resolved');
  });

  it('sanitizes alertId', () => {
    assert.equal(sanitizeAlertId(' stuck-m1-2026-07-01T00:00:00.000Z '), 'stuck-m1-2026-07-01T00:00:00.000Z');
    assert.throws(() => sanitizeAlertId(''), /1–200/);
    assert.throws(() => sanitizeAlertId('bad\nid'), /invalid/);
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
    },
    {
      tenantId: 't1',
      alertId: 'a2',
      status: 'resolved',
      actorUserId: 'u2',
      actorEmail: 'admin@example.com',
      updatedAt: '2026-08-02T12:00:00.000Z',
    },
  ];

  it('marks acknowledged and drops resolved by default', () => {
    const merged = applyAlertStatuses(
      [{ id: 'a1', summary: 'one' }, { id: 'a2', summary: 'two' }, { id: 'a3', summary: 'three' }],
      statuses,
    );
    assert.equal(merged.length, 2);
    assert.equal(merged[0].status, 'acknowledged');
    assert.equal(merged[0].acknowledgedBy, 'op@example.com');
    assert.equal(merged[0].acknowledgedAt, '2026-08-01T12:00:00.000Z');
    assert.equal(merged[1].id, 'a3');
    assert.equal(merged[1].status, 'open');
    assert.equal(merged[1].acknowledgedBy, null);
  });

  it('can include resolved when requested', () => {
    const merged = applyAlertStatuses([{ id: 'a2' }], statuses, { includeResolved: true });
    assert.equal(merged.length, 1);
    assert.equal(merged[0].status, 'resolved');
    assert.equal(merged[0].acknowledgedBy, 'admin@example.com');
  });

  it('isolates by alert id only (caller scopes tenant query)', () => {
    const other: AlertStatusRecord[] = [
      { ...statuses[0], tenantId: 'other', alertId: 'x' },
    ];
    const merged = applyAlertStatuses([{ id: 'a1' }], other);
    assert.equal(merged[0].status, 'open');
  });
});
