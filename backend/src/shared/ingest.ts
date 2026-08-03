import {
  applyMeterLocationUpsert,
  type MeterLocation,
  type MeterReading,
} from './meter-location.js';
import type { IngestParseResult, MappedReadingRow } from './csv-parse.js';

export interface MeterStore {
  getLocation(tenantId: string, meterId: string): Promise<MeterLocation | null>;
  putLocation(location: MeterLocation): Promise<void>;
  putReading(reading: MeterReading): Promise<void>;
  putMapping(tenantId: string, kind: string, mapping: Record<string, string>): Promise<void>;
  getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null>;
  listLocations(tenantId: string): Promise<MeterLocation[]>;
  listReadings(tenantId: string): Promise<MeterReading[]>;
}

export interface IngestCommitSummary {
  locationsUpserted: number;
  readingsWritten: number;
  addressConflicts: Array<{ meterId: string; existingAddress: string; incomingAddress: string }>;
  warnings: string[];
}

export async function commitCustomerIngest(
  store: MeterStore,
  tenantId: string,
  parsed: IngestParseResult,
): Promise<IngestCommitSummary> {
  const summary: IngestCommitSummary = {
    locationsUpserted: 0,
    readingsWritten: 0,
    addressConflicts: [],
    warnings: [...parsed.warnings],
  };

  if (parsed.errors.length) {
    throw new Error(parsed.errors.join(' '));
  }

  // Persist mapping for this tenant (B4 remembers mapping).
  const mappingRecord: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.mapping)) {
    if (v) mappingRecord[k] = v;
  }
  if (Object.keys(mappingRecord).length) {
    await store.putMapping(tenantId, 'customer_readings', mappingRecord);
  }

  const rows = [...parsed.rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const row of rows) {
    await upsertFromRow(store, tenantId, row, summary);
  }

  return summary;
}

async function upsertFromRow(
  store: MeterStore,
  tenantId: string,
  row: MappedReadingRow,
  summary: IngestCommitSummary,
): Promise<void> {
  const existing = await store.getLocation(tenantId, row.meterId);
  const { location, addressConflict } = applyMeterLocationUpsert(existing, {
    tenantId,
    meterId: row.meterId,
    serviceAddress: row.serviceAddress,
    occupantName: row.occupantName,
    accountNumber: row.accountNumber,
    route: row.route,
    updatedAt: new Date().toISOString(),
  });

  if (addressConflict && existing) {
    summary.addressConflicts.push({
      meterId: row.meterId,
      existingAddress: existing.serviceAddress,
      incomingAddress: row.serviceAddress,
    });
    summary.warnings.push(
      `Meter ${row.meterId}: address in file ("${row.serviceAddress}") does not match saved address ("${existing.serviceAddress}"). We kept the saved address and did not move the meter; occupant/account updates still applied.`,
    );
  }

  await store.putLocation(location);
  summary.locationsUpserted += 1;

  const reading: MeterReading = {
    tenantId,
    meterId: row.meterId,
    serviceAddress: location.serviceAddress,
    occupantName: row.occupantName,
    timestamp: row.timestamp,
    cumulativeReading: row.cumulativeReading,
    unit: row.unit,
    diagnosticFlags: row.diagnosticFlags,
  };
  await store.putReading(reading);
  summary.readingsWritten += 1;
}
