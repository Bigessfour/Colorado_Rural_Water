import type { MeterLocation, MeterReading } from './meter-location.js';
import type { MeterStore } from './ingest.js';

/** In-memory store for unit tests. */
export class MemoryMeterStore implements MeterStore {
  private locations = new Map<string, MeterLocation>();
  private readings: MeterReading[] = [];
  private mappings = new Map<string, Record<string, string>>();

  private locKey(tenantId: string, meterId: string): string {
    return `${tenantId}::${meterId}`;
  }

  async getLocation(tenantId: string, meterId: string): Promise<MeterLocation | null> {
    return this.locations.get(this.locKey(tenantId, meterId)) ?? null;
  }

  async putLocation(location: MeterLocation): Promise<void> {
    this.locations.set(this.locKey(location.tenantId, location.meterId), location);
  }

  async putReading(reading: MeterReading): Promise<void> {
    this.readings.push(reading);
  }

  async putMapping(
    tenantId: string,
    kind: string,
    mapping: Record<string, string>,
  ): Promise<void> {
    this.mappings.set(`${tenantId}::${kind}`, mapping);
  }

  async getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null> {
    return this.mappings.get(`${tenantId}::${kind}`) ?? null;
  }

  async listLocations(tenantId: string): Promise<MeterLocation[]> {
    return [...this.locations.values()].filter((l) => l.tenantId === tenantId);
  }

  async listReadings(tenantId: string): Promise<MeterReading[]> {
    return this.readings.filter((r) => r.tenantId === tenantId);
  }
}
