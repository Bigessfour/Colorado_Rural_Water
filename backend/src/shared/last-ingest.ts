/**
 * Most recent successful customer ingest for a tenant (dashboard status line).
 * Stored under META#last_ingest — not mixed with meter LOC#/RDG# data.
 */

export interface LastIngestRecord {
  tenantId: string;
  /** ISO timestamp of successful commit. */
  at: string;
  /** Rows accepted into Dynamo. */
  goodRows: number;
  /** Rows skipped / failed quality (not stack-trace errors). */
  badRows: number;
  readingsWritten: number;
  filename?: string | null;
}

export interface LastIngestStore {
  getLastIngest(tenantId: string): Promise<LastIngestRecord | null>;
  putLastIngest(record: LastIngestRecord): Promise<void>;
}

export function buildLastIngestRecord(input: {
  tenantId: string;
  at?: string;
  rowsAccepted: number;
  rowsSkipped: number;
  readingsWritten: number;
  filename?: string | null;
}): LastIngestRecord {
  return {
    tenantId: input.tenantId,
    at: input.at ?? new Date().toISOString(),
    goodRows: Math.max(0, Math.floor(input.rowsAccepted)),
    badRows: Math.max(0, Math.floor(input.rowsSkipped)),
    readingsWritten: Math.max(0, Math.floor(input.readingsWritten)),
    filename: input.filename?.trim() || null,
  };
}
