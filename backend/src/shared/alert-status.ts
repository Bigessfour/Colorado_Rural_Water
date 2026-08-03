/**
 * Alert acknowledge / dispatch / resolve persistence — Spec §9 / ticket C3 (+ dispatch).
 * Current status: TENANT#… / ALERT#STATUS#{alertId}
 * Activity timeline: TENANT#… / ALERT#EVT#{meterKey}#{createdAt}#{alertId}
 */

export type AlertLifecycleStatus = 'open' | 'acknowledged' | 'dispatched' | 'resolved';

export type AlertStatusAction = 'acknowledge' | 'accept' | 'dispatch' | 'resolve';

export interface AlertStatusRecord {
  tenantId: string;
  alertId: string;
  status: Exclude<AlertLifecycleStatus, 'open'>;
  actorUserId: string;
  actorEmail: string;
  updatedAt: string;
  /** Optional “action taken” note from the operator. */
  note: string | null;
  /** Meter this alert belongs to (null for balance / system alerts). */
  meterId: string | null;
  /** Snapshot of alert summary at action time. */
  summary: string | null;
}

export interface AlertActivityEvent {
  tenantId: string;
  eventId: string;
  alertId: string;
  meterId: string | null;
  action: AlertStatusAction;
  status: AlertStatusRecord['status'];
  actorUserId: string;
  actorEmail: string;
  note: string | null;
  summary: string | null;
  createdAt: string;
}

export interface AlertStatusStore {
  putAlertStatus(record: AlertStatusRecord): Promise<void>;
  getAlertStatus(tenantId: string, alertId: string): Promise<AlertStatusRecord | null>;
  listAlertStatuses(tenantId: string): Promise<AlertStatusRecord[]>;
  putAlertActivity(event: AlertActivityEvent): Promise<void>;
  listAlertActivityForMeter(tenantId: string, meterId: string): Promise<AlertActivityEvent[]>;
  /**
   * Atomically persist status + optional meter activity.
   * Pass activity=null for balance/system alerts (status only).
   */
  putAlertStatusAndActivity(
    record: AlertStatusRecord,
    activity: AlertActivityEvent | null,
  ): Promise<void>;
}

export function isAlertStatusAction(value: unknown): value is AlertStatusAction {
  return (
    value === 'acknowledge' ||
    value === 'accept' ||
    value === 'dispatch' ||
    value === 'resolve'
  );
}

export function statusFromAction(action: AlertStatusAction): AlertStatusRecord['status'] {
  if (action === 'resolve') return 'resolved';
  if (action === 'dispatch') return 'dispatched';
  // accept === acknowledge
  return 'acknowledged';
}

/** Sanitize alertId for Dynamo SK suffix (no path separators / control chars). */
export function sanitizeAlertId(alertId: string): string {
  const trimmed = alertId.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new Error('alertId must be 1–200 characters');
  }
  if (/[\u0000-\u001f\\]/.test(trimmed)) {
    throw new Error('alertId contains invalid characters');
  }
  return trimmed;
}

export function sanitizeActionNote(note: unknown): string | null {
  if (note == null) return null;
  if (typeof note !== 'string') {
    throw new Error('note must be a string');
  }
  const trimmed = note.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000) {
    throw new Error('note must be at most 1000 characters');
  }
  return trimmed;
}

export function sanitizeMeterIdForAlert(meterId: unknown): string | null {
  if (meterId == null || meterId === '') return null;
  if (typeof meterId !== 'string') {
    throw new Error('meterId must be a string');
  }
  const trimmed = meterId.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) {
    throw new Error('meterId must be at most 120 characters');
  }
  if (/[\u0000-\u001f\\/#]/.test(trimmed)) {
    throw new Error('meterId contains invalid characters');
  }
  return trimmed;
}

/**
 * Resolve action target from evaluated alerts only — never trust client meterId.
 */
export function resolveAlertActionTarget(
  alertId: string,
  meterAlerts: Array<{ id: string; meterId: string; summary: string }>,
  balanceAlerts: Array<{ id: string; summary: string }>,
):
  | { kind: 'meter'; meterId: string; summary: string }
  | { kind: 'balance'; meterId: null; summary: string }
  | null {
  const meter = meterAlerts.find((a) => a.id === alertId);
  if (meter) {
    return { kind: 'meter', meterId: meter.meterId, summary: meter.summary };
  }
  const balance = balanceAlerts.find((a) => a.id === alertId);
  if (balance) {
    return { kind: 'balance', meterId: null, summary: balance.summary };
  }
  return null;
}

/** Partition key segment for activity SKs (balance alerts share one bucket). */
export function meterKeyForActivity(meterId: string | null): string {
  return meterId && meterId.trim() ? meterId.trim() : '_balance';
}

export function alertActivitySk(input: {
  meterId: string | null;
  createdAt: string;
  alertId: string;
}): string {
  return `ALERT#EVT#${meterKeyForActivity(input.meterId)}#${input.createdAt}#${input.alertId}`;
}

export type WithLifecycleStatus<T extends { id: string }> = T & {
  status: AlertLifecycleStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  actionNote: string | null;
};

/**
 * Merge evaluated alerts with persisted statuses.
 * Resolved alerts are omitted unless includeResolved is true.
 */
export function applyAlertStatuses<T extends { id: string }>(
  alerts: T[],
  statuses: AlertStatusRecord[],
  options?: { includeResolved?: boolean },
): WithLifecycleStatus<T>[] {
  const byId = new Map(statuses.map((s) => [s.alertId, s]));
  const includeResolved = options?.includeResolved === true;
  const out: WithLifecycleStatus<T>[] = [];

  for (const alert of alerts) {
    const rec = byId.get(alert.id);
    if (!rec) {
      out.push({
        ...alert,
        status: 'open',
        acknowledgedBy: null,
        acknowledgedAt: null,
        actionNote: null,
      });
      continue;
    }
    if (rec.status === 'resolved' && !includeResolved) continue;
    out.push({
      ...alert,
      status: rec.status,
      acknowledgedBy: rec.actorEmail || rec.actorUserId || null,
      acknowledgedAt: rec.updatedAt,
      actionNote: rec.note,
    });
  }

  return out;
}

/** In-memory store for unit tests. */
export class MemoryAlertStatusStore implements AlertStatusStore {
  private readonly statuses = new Map<string, AlertStatusRecord>();
  private readonly events: AlertActivityEvent[] = [];

  private statusKey(tenantId: string, alertId: string): string {
    return `${tenantId}::${alertId}`;
  }

  async putAlertStatus(record: AlertStatusRecord): Promise<void> {
    this.statuses.set(this.statusKey(record.tenantId, record.alertId), { ...record });
  }

  async getAlertStatus(tenantId: string, alertId: string): Promise<AlertStatusRecord | null> {
    return this.statuses.get(this.statusKey(tenantId, alertId)) ?? null;
  }

  async listAlertStatuses(tenantId: string): Promise<AlertStatusRecord[]> {
    return [...this.statuses.values()].filter((r) => r.tenantId === tenantId);
  }

  async putAlertActivity(event: AlertActivityEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async listAlertActivityForMeter(
    tenantId: string,
    meterId: string,
  ): Promise<AlertActivityEvent[]> {
    return this.events
      .filter((e) => e.tenantId === tenantId && e.meterId === meterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async putAlertStatusAndActivity(
    record: AlertStatusRecord,
    activity: AlertActivityEvent | null,
  ): Promise<void> {
    await this.putAlertStatus(record);
    if (activity) await this.putAlertActivity(activity);
  }
}
