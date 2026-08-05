/**
 * Client-side meter inventory search for the Meters table / map.
 * Multi-token queries require every token to match somewhere in the haystack.
 */

export type MeterListFilterRow = {
  meterId: string;
  serviceAddress: string;
  occupantName?: string | null;
  accountNumber?: string | null;
  route?: string | null;
  serialNumber?: string | null;
  radioId?: string | null;
  manufacturer?: string | null;
  model?: string | null;
};

export function filterMeterRows<T extends MeterListFilterRow>(rows: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return rows;

  return rows.filter((m) => {
    const hay = [
      m.meterId,
      m.serviceAddress,
      m.occupantName,
      m.accountNumber,
      m.route,
      m.serialNumber,
      m.radioId,
      m.manufacturer,
      m.model,
    ]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join('\n')
      .toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}
