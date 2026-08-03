import type { SourceIngestParseResult } from './source-csv-parse.js';
import type { SourceReading } from './source-reading.js';
import type { SourceStore } from './source-store.js';
import {
  normalizeWaterSourceInput,
  slugifySourceId,
  type WaterSource,
} from './water-source.js';

export interface SourceIngestCommitSummary {
  sourcesCreated: number;
  readingsWritten: number;
  warnings: string[];
}

/**
 * Resolve named sources (create if missing) and write source readings (G2).
 */
export async function commitSourceIngest(
  store: SourceStore,
  tenantId: string,
  parsed: SourceIngestParseResult,
): Promise<SourceIngestCommitSummary> {
  const summary: SourceIngestCommitSummary = {
    sourcesCreated: 0,
    readingsWritten: 0,
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
    await store.putMapping(tenantId, 'source_readings', mappingRecord);
  }

  const existing = await store.listSources(tenantId);
  const byId = new Map(existing.map((s) => [s.sourceId, s]));
  const byNameKey = new Map(existing.map((s) => [normalizeNameKey(s.name), s]));

  const rows = [...parsed.rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const row of rows) {
    let source = resolveExisting(row.sourceId, row.sourceName, byId, byNameKey);

    if (!source) {
      const preferredId = row.sourceId?.trim() || slugifySourceId(row.sourceName);
      let sourceId = preferredId;
      if (byId.has(sourceId)) {
        sourceId = slugifySourceId(row.sourceName, Date.now().toString(36).slice(-4));
      }
      const normalized = normalizeWaterSourceInput(tenantId, {
        name: row.sourceName,
        type: row.sourceType ?? 'well',
        sourceId,
        unit: row.unit,
        notes: null,
      });
      if (!normalized.ok) {
        summary.warnings.push(`Row ${row.sourceLine}: could not create source — ${normalized.error}`);
        continue;
      }
      await store.putSource(normalized.source);
      source = normalized.source;
      byId.set(source.sourceId, source);
      byNameKey.set(normalizeNameKey(source.name), source);
      summary.sourcesCreated += 1;
      summary.warnings.push(
        `Created named source “${source.name}” (${source.sourceId}) from ingest row ${row.sourceLine}.`,
      );
    }

    const reading: SourceReading = {
      tenantId,
      sourceId: source.sourceId,
      sourceName: source.name,
      timestamp: row.timestamp,
      value: row.value,
      volumeMode: row.volumeMode,
      unit: row.unit,
      notes: row.notes,
    };
    await store.putSourceReading(reading);
    summary.readingsWritten += 1;
  }

  return summary;
}

function resolveExisting(
  sourceId: string | null,
  sourceName: string,
  byId: Map<string, WaterSource>,
  byNameKey: Map<string, WaterSource>,
): WaterSource | undefined {
  if (sourceId && byId.has(sourceId)) return byId.get(sourceId);
  const slug = slugifySourceId(sourceName);
  if (byId.has(slug)) return byId.get(slug);
  return byNameKey.get(normalizeNameKey(sourceName));
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
