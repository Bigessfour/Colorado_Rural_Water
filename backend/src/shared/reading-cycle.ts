/**
 * Per-tenant billing / reading cycle close day (P2 Pilot).
 * Default 0 = UTC calendar month (pilot baseline).
 * When cycleCloseDay is 2–28, period key is YYYY-MM of the cycle-close month.
 */

export interface ReadingCycleConfig {
  tenantId: string;
  /** 0 = calendar UTC month; 2–28 = day of month when the cycle closes. */
  cycleCloseDay: number;
  updatedAt: string;
  updatedByUserId: string;
  updatedByEmail: string;
}

export interface ReadingCycleStore {
  getReadingCycle(tenantId: string): Promise<ReadingCycleConfig | null>;
  putReadingCycle(config: ReadingCycleConfig): Promise<void>;
}

export const DEFAULT_CYCLE_CLOSE_DAY = 0;

export function normalizeCycleCloseDay(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_CYCLE_CLOSE_DAY;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const day = Math.floor(n);
  if (day === 0) return 0;
  if (day >= 2 && day <= 28) return day;
  return null;
}

/**
 * Map an ISO timestamp to a YYYY-MM period key.
 * cycleCloseDay 0 → UTC calendar month; otherwise cycle-close month (see file header).
 */
export function periodKeyFromIso(iso: string, cycleCloseDay = DEFAULT_CYCLE_CLOSE_DAY): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (!cycleCloseDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (day > cycleCloseDay) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function mergeReadingCycle(
  stored: ReadingCycleConfig | null | undefined,
): { cycleCloseDay: number; source: 'default' | 'tenant'; updatedAt?: string } {
  if (!stored) {
    return { cycleCloseDay: DEFAULT_CYCLE_CLOSE_DAY, source: 'default' };
  }
  return {
    cycleCloseDay: stored.cycleCloseDay,
    source: 'tenant',
    updatedAt: stored.updatedAt,
  };
}
