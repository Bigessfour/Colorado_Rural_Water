import {
  applyMeterLocationUpsert,
  type MeterLocation,
  type MeterReading,
} from './meter-location.js';
import type { IngestParseResult, MappedReadingRow } from './csv-parse.js';
import {
  INGEST_BATCH_GET_SIZE,
  INGEST_BATCH_WRITE_SIZE,
} from './ingest-limits.js';

export interface MeterStore {
  getLocation(tenantId: string, meterId: string): Promise<MeterLocation | null>;
  putLocation(location: MeterLocation): Promise<void>;
  putReading(reading: MeterReading): Promise<void>;
  putMapping(tenantId: string, kind: string, mapping: Record<string, string>): Promise<void>;
  getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null>;
  listLocations(tenantId: string): Promise<MeterLocation[]>;
  listReadings(tenantId: string): Promise<MeterReading[]>;
  listReadingsForMeter(tenantId: string, meterId: string): Promise<MeterReading[]>;
  deleteLocation(tenantId: string, meterId: string): Promise<boolean>;
  /** Optional batch helpers (Dynamo production path). */
  batchGetLocations?(
    tenantId: string,
    meterIds: string[],
  ): Promise<Map<string, MeterLocation>>;
  batchWriteMeterRecords?(
    locations: MeterLocation[],
    readings: MeterReading[],
  ): Promise<void>;
}

export interface IngestCommitSummary {
  locationsUpserted: number;
  readingsWritten: number;
  metersTracked: number;
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
    metersTracked: 0,
    addressConflicts: [],
    warnings: [...parsed.warnings],
  };

  if (parsed.errors.length) {
    throw new Error(parsed.errors.join(' '));
  }

  const mappingRecord: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.mapping)) {
    if (v) mappingRecord[k] = v;
  }
  if (Object.keys(mappingRecord).length) {
    await store.putMapping(tenantId, 'customer_readings', mappingRecord);
  }

  const rows = [...parsed.rows].sort((a, b) => {
    const aHas = a.serviceAddress.trim() ? 0 : 1;
    const bHas = b.serviceAddress.trim() ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.timestamp.localeCompare(b.timestamp);
  });

  const locationCache = new Map<string, MeterLocation | null>();
  const uniqueMeters = new Set<string>();
  const pendingLocations: MeterLocation[] = [];
  const pendingReadings: MeterReading[] = [];
  const useBatch = typeof store.batchWriteMeterRecords === 'function';

  const uniqueMeterIds = [...new Set(rows.map((r) => r.meterId))];
  if (store.batchGetLocations) {
    const prefetched = await store.batchGetLocations(tenantId, uniqueMeterIds);
    for (const id of uniqueMeterIds) {
      locationCache.set(id, prefetched.get(id) ?? null);
    }
  }

  const flushBatch = async (): Promise<void> => {
    if (!useBatch || (pendingLocations.length === 0 && pendingReadings.length === 0)) {
      return;
    }
    const locs = pendingLocations.splice(0, pendingLocations.length);
    const rdgs = pendingReadings.splice(0, pendingReadings.length);
    await store.batchWriteMeterRecords!(locs, rdgs);
  };

  for (const row of rows) {
    const wrote = await upsertFromRow(
      store,
      tenantId,
      row,
      summary,
      locationCache,
      useBatch ? pendingLocations : null,
      useBatch ? pendingReadings : null,
    );
    if (wrote) {
      uniqueMeters.add(row.meterId);
      if (useBatch && pendingLocations.length + pendingReadings.length >= INGEST_BATCH_WRITE_SIZE * 2) {
        await flushBatch();
      }
    }
  }
  await flushBatch();

  summary.metersTracked = uniqueMeters.size;
  return summary;
}

async function upsertFromRow(
  store: MeterStore,
  tenantId: string,
  row: MappedReadingRow,
  summary: IngestCommitSummary,
  locationCache: Map<string, MeterLocation | null>,
  pendingLocations: MeterLocation[] | null,
  pendingReadings: MeterReading[] | null,
): Promise<boolean> {
  let existing = locationCache.get(row.meterId);
  if (existing === undefined) {
    existing = await store.getLocation(tenantId, row.meterId);
    locationCache.set(row.meterId, existing);
  }

  const incomingAddress = row.serviceAddress.trim();
  if (!incomingAddress && !existing) {
    summary.warnings.push(
      `Meter ${row.meterId}: skipped reading — no service address in file and this meter is not on file yet.`,
    );
    return false;
  }

  const { location, addressConflict } = applyMeterLocationUpsert(existing, {
    tenantId,
    meterId: row.meterId,
    serviceAddress: incomingAddress || existing!.serviceAddress,
    occupantName: row.occupantName,
    accountNumber: row.accountNumber,
    route: row.route,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serialNumber,
    meterSize: row.meterSize,
    installDate: row.installDate,
    meterType: row.meterType,
    locationDetail: row.locationDetail,
    radioId: row.radioId,
    lastTestedAt: row.lastTestedAt,
    notes: row.notes,
    updatedAt: new Date().toISOString(),
  });

  if (addressConflict && existing && incomingAddress) {
    summary.addressConflicts.push({
      meterId: row.meterId,
      existingAddress: existing.serviceAddress,
      incomingAddress: row.serviceAddress,
    });
    summary.warnings.push(
      `Meter ${row.meterId}: address in file ("${row.serviceAddress}") does not match saved address ("${existing.serviceAddress}"). We kept the saved address and did not move the meter; occupant/account updates still applied.`,
    );
  }

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

  locationCache.set(row.meterId, location);

  if (pendingLocations && pendingReadings) {
    pendingLocations.push(location);
    pendingReadings.push(reading);
  } else {
    await store.putLocation(location);
    await store.putReading(reading);
  }

  summary.locationsUpserted += 1;
  summary.readingsWritten += 1;
  return true;
}

export { INGEST_BATCH_GET_SIZE, INGEST_BATCH_WRITE_SIZE };
