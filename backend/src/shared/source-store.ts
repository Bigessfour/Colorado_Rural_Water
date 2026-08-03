import type { WaterSource } from './water-source.js';

export interface SourceStore {
  listSources(tenantId: string): Promise<WaterSource[]>;
  getSource(tenantId: string, sourceId: string): Promise<WaterSource | null>;
  putSource(source: WaterSource): Promise<void>;
  deleteSource(tenantId: string, sourceId: string): Promise<boolean>;
}

/** In-memory store for unit tests — always filters by tenantId. */
export class MemorySourceStore implements SourceStore {
  private sources = new Map<string, WaterSource>();

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
    return this.sources.delete(this.key(tenantId, sourceId));
  }
}
