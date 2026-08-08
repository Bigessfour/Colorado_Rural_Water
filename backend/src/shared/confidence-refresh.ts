/**
 * Recompute and persist tenant Confidence after ingest or on demand.
 */

import { assessTenantConfidence } from './alert-engine.js';
import {
  confidenceRecordFromSnapshot,
  type ConfidenceRecord,
} from './confidence-store.js';
import {
  createConfidenceStoreFromEnv,
  createMeterStoreFromEnv,
} from './dynamo-store.js';

export async function refreshTenantConfidence(
  tenantId: string,
): Promise<ConfidenceRecord> {
  const meterStore = createMeterStoreFromEnv();
  const [locations, readings] = await Promise.all([
    meterStore.listLocations(tenantId),
    meterStore.listReadings(tenantId),
  ]);
  const snapshot = assessTenantConfidence(readings, locations.length);
  const record = confidenceRecordFromSnapshot(
    tenantId,
    snapshot,
    locations.length,
  );
  await createConfidenceStoreFromEnv().putConfidence(record);
  return record;
}

/** Load persisted Confidence; refresh when absent. */
export async function loadTenantConfidence(
  tenantId: string,
): Promise<ConfidenceRecord> {
  const store = createConfidenceStoreFromEnv();
  const existing = await store.getConfidence(tenantId);
  if (existing) return existing;
  return refreshTenantConfidence(tenantId);
}
