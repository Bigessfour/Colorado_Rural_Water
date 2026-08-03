import type { SourceReading } from './source-reading.js';
import type { WaterSource } from './water-source.js';

export interface SourceStore {
  listSources(tenantId: string): Promise<WaterSource[]>;
  getSource(tenantId: string, sourceId: string): Promise<WaterSource | null>;
  putSource(source: WaterSource): Promise<void>;
  /** Deletes SRC# and cascades SRD# for that sourceId (tenant-scoped). */
  deleteSource(tenantId: string, sourceId: string): Promise<boolean>;
  putSourceReading(reading: SourceReading): Promise<void>;
  listSourceReadings(tenantId: string): Promise<SourceReading[]>;
  /** Optional: readings for one source (used by cascade / tests). */
  listSourceReadingsForSource?(tenantId: string, sourceId: string): Promise<SourceReading[]>;
  putMapping(tenantId: string, kind: string, mapping: Record<string, string>): Promise<void>;
  getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null>;
}

/** In-memory store for unit tests — always filters by tenantId. */
export class MemorySourceStore implements SourceStore {
  private sources = new Map<string, WaterSource>();
  private readings: SourceReading[] = [];
  private mappings = new Map<string, Record<string, string>>();

  private key(tenantId: string, sourceId: string): string {
    return `${tenantId}::${sourceId}`;
  }

  async listSources(tenantId: string): Promise<WaterSource[]> {
    return [...this.sources.values()]
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSource(tenantId: string, sourceId: string): Promise<WaterSource | null> {
    const hit = this.sources.get(this.key(tenantId, sourceId));
    return hit && hit.tenantId === tenantId ? hit : null;
  }

  async putSource(source: WaterSource): Promise<void> {
    this.sources.set(this.key(source.tenantId, source.sourceId), { ...source });
  }

  async deleteSource(tenantId: string, sourceId: string): Promise<boolean> {
    const existed = this.sources.delete(this.key(tenantId, sourceId));
    if (!existed) return false;
    // Cascade: drop SRD# for this source so balance does not keep orphans.
    this.readings = this.readings.filter(
      (r) => !(r.tenantId === tenantId && r.sourceId === sourceId),
    );
    return true;
  }

  async putSourceReading(reading: SourceReading): Promise<void> {
    this.readings = this.readings.filter(
      (r) =>
        !(
          r.tenantId === reading.tenantId &&
          r.sourceId === reading.sourceId &&
          r.timestamp === reading.timestamp
        ),
    );
    this.readings.push({ ...reading });
  }

  async listSourceReadings(tenantId: string): Promise<SourceReading[]> {
    return this.readings
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async listSourceReadingsForSource(
    tenantId: string,
    sourceId: string,
  ): Promise<SourceReading[]> {
    return this.readings
      .filter((r) => r.tenantId === tenantId && r.sourceId === sourceId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async putMapping(
    tenantId: string,
    kind: string,
    mapping: Record<string, string>,
  ): Promise<void> {
    this.mappings.set(`${tenantId}::${kind}`, { ...mapping });
  }

  async getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null> {
    return this.mappings.get(`${tenantId}::${kind}`) ?? null;
  }
}
