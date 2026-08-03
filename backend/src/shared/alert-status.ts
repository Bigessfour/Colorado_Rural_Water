/**
 * Alert acknowledge / resolve persistence — Spec §9 / ticket C3.
 * Status lives under TENANT#… / ALERT#STATUS#{alertId} with actor audit.
 */

export type AlertLifecycleStatus = 'open' | 'acknowledged' | 'resolved';

export type AlertStatusAction = 'acknowledge' | 'resolve';

export interface AlertStatusRecord {
  tenantId: string;
  alertId: string;
  status: 'acknowledged' | 'resolved';
  actorUserId: string;
  actorEmail: string;
  updatedAt: string;
}

export interface AlertStatusStore {
  putAlertStatus(record: AlertStatusRecord): Promise<void>;
  getAlertStatus(tenantId: string, alertId: string): Promise<AlertStatusRecord | null>;
  listAlertStatuses(tenantId: string): Promise<AlertStatusRecord[]>;
}

export function isAlertStatusAction(value: unknown): value is AlertStatusAction {
  return value === 'acknowledge' || value === 'resolve';
}

export function statusFromAction(action: AlertStatusAction): AlertStatusRecord['status'] {
  return action === 'resolve' ? 'resolved' : 'acknowledged';
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

export type WithLifecycleStatus<T extends { id: string }> = T & {
  status: AlertLifecycleStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
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
      });
      continue;
    }
    if (rec.status === 'resolved' && !includeResolved) continue;
    out.push({
      ...alert,
      status: rec.status,
      acknowledgedBy: rec.actorEmail || rec.actorUserId || null,
      acknowledgedAt: rec.updatedAt,
    });
  }

  return out;
}
