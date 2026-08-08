/**
 * Named water sources (wells/springs) + production readings — Kelly demo steps 3–4.
 * Map pins (lat/lng) mirror Meters so wells show on the Sources map.
 * Fixture: sample-data/messy-source-readings-july.csv.
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUploadModule, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { buildSourcePlaceQuery, geocodeServiceAddress, type GeocodeBias } from '../../shared/geocode.service';
import {
  MeterMapComponent,
  type MapLocationPick,
  type MeterMapPoint,
} from '../meters/meter-map.component';

type SourceType = 'well' | 'spring' | 'purchase' | 'other';

interface WaterSourceRow {
  sourceId: string;
  name: string;
  type: SourceType;
  unit: string;
  notes: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

@Component({
  selector: 'app-sources-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    MessageModule,
    FileUploadModule,
    MeterMapComponent,
  ],
  templateUrl: './sources-page.component.html',
  styleUrl: './sources-page.component.scss',
})
export class SourcesPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  readonly typeOptions = [
    { label: 'Well', value: 'well' as SourceType },
    { label: 'Spring', value: 'spring' as SourceType },
    { label: 'Purchase', value: 'purchase' as SourceType },
    { label: 'Other', value: 'other' as SourceType },
  ];

  sources = signal<WaterSourceRow[]>([]);
  selectedSourceId = signal<string | null>(null);
  fineTune = signal(false);
  geocodeHint = signal('');
  busy = signal(false);
  saving = signal(false);
  ingesting = signal(false);
  error = signal('');
  status = signal('');

  name = '';
  type: SourceType = 'well';
  notes = '';
  locationLabel = '';
  latitude = '';
  longitude = '';
  editingId: string | null = null;

  /** Manual period reading */
  readingSourceId = '';
  readingDate = '';
  readingVolume = '';
  readingNotes = '';

  csvText = '';
  ingestHint =
    'Practice file: sample-data/messy-source-readings-july.csv (production volumes by period; “messy” = imperfect columns for a safe mapper demo).';

  readonly mapPoints = computed<MeterMapPoint[]>(() =>
    this.sources().map((s) => ({
      meterId: s.sourceId,
      serviceAddress: s.locationLabel?.trim()
        ? `${s.name} — ${s.locationLabel}`
        : s.name,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
  );

  ngOnInit(): void {
    void this.refresh();
  }

  resetForm(): void {
    this.name = '';
    this.type = 'well';
    this.notes = '';
    this.locationLabel = '';
    this.latitude = '';
    this.longitude = '';
    this.editingId = null;
    this.selectedSourceId.set(null);
    this.fineTune.set(false);
    this.geocodeHint.set('');
  }

  startEdit(row: WaterSourceRow): void {
    this.editingId = row.sourceId;
    this.name = row.name;
    this.type = row.type;
    this.notes = row.notes ?? '';
    this.locationLabel = row.locationLabel ?? '';
    this.latitude = row.latitude == null ? '' : String(row.latitude);
    this.longitude = row.longitude == null ? '' : String(row.longitude);
    this.selectedSourceId.set(row.sourceId);
    this.fineTune.set(true);
    this.geocodeHint.set('');
  }

  selectSource(sourceId: string): void {
    this.selectedSourceId.set(sourceId);
    const row = this.sources().find((s) => s.sourceId === sourceId);
    if (row) this.startEdit(row);
  }

  toggleFineTune(): void {
    const next = !this.fineTune();
    this.fineTune.set(next);
    this.status.set(
      next
        ? 'Fine-tune on — select a source, then drag the pin or click the map.'
        : 'Fine-tune off.',
    );
  }

  onSourceCsvUpload(event: FileUploadHandlerEvent): void {
    const file = event.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.csvText = String(reader.result ?? '');
      this.status.set(`Loaded ${file.name} — ready to import source readings.`);
    };
    reader.readAsText(file);
  }

  geocodeBias(): GeocodeBias {
    const center = this.auth.mapCenter();
    const town = (center?.town ?? this.auth.placeName() ?? '').trim();
    let zip = '';
    if (/\bwiley\b/i.test(town)) zip = '81092';
    return {
      town: town || null,
      zip: zip || null,
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
      maxMiles: 35,
    };
  }

  async suggestFromLabel(): Promise<void> {
    const label = this.locationLabel.trim() || this.name.trim();
    if (!label) {
      this.error.set('Enter a place / road label (or name), then suggest a map pin.');
      return;
    }
    this.geocodeHint.set('');
    this.error.set('');
    try {
      const query = buildSourcePlaceQuery(this.name, this.locationLabel, this.geocodeBias());
      const hit = await geocodeServiceAddress(query, this.geocodeBias());
      if (!hit) {
        this.geocodeHint.set('No nearby match — try a fuller place label or place the pin by hand.');
        return;
      }
      this.latitude = String(hit.latitude);
      this.longitude = String(hit.longitude);
      this.geocodeHint.set(`Matched “${hit.label}”. ${hit.note}`);
      if (this.editingId) {
        await this.persistCoords(this.editingId, hit.latitude, hit.longitude);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Geocode failed');
    }
  }

  async onMapLocationPicked(pick: MapLocationPick): Promise<void> {
    this.selectedSourceId.set(pick.meterId);
    if (this.editingId === pick.meterId) {
      this.latitude = String(pick.latitude);
      this.longitude = String(pick.longitude);
    }
    await this.persistCoords(pick.meterId, pick.latitude, pick.longitude);
  }

  async refresh(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to manage named sources for your system.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/sources`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      const rows = ((body.sources ?? []) as WaterSourceRow[]).map((s) => ({
        ...s,
        locationLabel: s.locationLabel ?? null,
        latitude: typeof s.latitude === 'number' ? s.latitude : null,
        longitude: typeof s.longitude === 'number' ? s.longitude : null,
      }));
      this.sources.set(rows);
      this.status.set(`${body.count ?? 0} named source(s) for your system.`);
      if (!this.readingSourceId && rows[0]?.sourceId) {
        this.readingSourceId = rows[0].sourceId;
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  private parseCoords():
    | { ok: true; latitude: number | null; longitude: number | null }
    | { ok: false; error: string } {
    const lat = this.latitude.trim();
    const lng = this.longitude.trim();
    if (!lat && !lng) return { ok: true, latitude: null, longitude: null };
    if (!lat || !lng) {
      return { ok: false, error: 'Enter both latitude and longitude, or clear both.' };
    }
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { ok: false, error: 'Latitude must be between -90 and 90.' };
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { ok: false, error: 'Longitude must be between -180 and 180.' };
    }
    return { ok: true, latitude, longitude };
  }

  async save(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to save sources.');
      return;
    }
    if (!this.name.trim()) {
      this.error.set('Give the source a clear name (e.g. Well 1 – North).');
      return;
    }
    const coords = this.parseCoords();
    if (!coords.ok) {
      this.error.set(coords.error);
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const payload = {
        name: this.name.trim(),
        type: this.type,
        notes: this.notes.trim() || null,
        locationLabel: this.locationLabel.trim() || null,
        unit: 'gal',
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      const url = this.editingId
        ? `${environment.apiBaseUrl}/sources/${encodeURIComponent(this.editingId)}`
        : `${environment.apiBaseUrl}/sources`;
      const res = await fetch(url, {
        method: this.editingId ? 'PUT' : 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Save failed (${res.status})`);
        return;
      }
      this.status.set(
        this.editingId
          ? `Updated ${body.source?.name ?? this.name}.`
          : `Added ${body.source?.name ?? this.name}.`,
      );
      this.resetForm();
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(row: WaterSourceRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    if (!confirm(`Remove “${row.name}”? Its source readings will also be deleted.`)) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/sources/${encodeURIComponent(row.sourceId)}`,
        {
          method: 'DELETE',
          headers: { authorization: `Bearer ${token}` },
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Delete failed (${res.status})`);
        return;
      }
      if (this.editingId === row.sourceId) this.resetForm();
      this.status.set(`Removed ${row.name}.`);
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  private async persistCoords(
    sourceId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    const row = this.sources().find((s) => s.sourceId === sourceId);
    if (!row) return;
    this.error.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/sources/${encodeURIComponent(sourceId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            name: row.name,
            type: row.type,
            notes: row.notes,
            locationLabel: row.locationLabel,
            unit: row.unit,
            latitude,
            longitude,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Could not save map pin (${res.status})`);
        return;
      }
      this.sources.update((list) =>
        list.map((s) =>
          s.sourceId === sourceId
            ? {
                ...s,
                latitude,
                longitude,
                locationLabel: body.source?.locationLabel ?? s.locationLabel,
              }
            : s,
        ),
      );
      if (this.editingId === sourceId) {
        this.latitude = String(latitude);
        this.longitude = String(longitude);
      }
      this.status.set(`Saved map pin for ${row.name}.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    }
  }

  async saveManualReading(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to enter a source reading.');
      return;
    }
    if (!this.readingSourceId || !this.readingDate || !this.readingVolume.trim()) {
      this.error.set('Pick a source, read date, and period volume (gal).');
      return;
    }
    const periodVolume = Number(this.readingVolume.replace(/,/g, ''));
    if (!Number.isFinite(periodVolume) || periodVolume < 0) {
      this.error.set('Period volume must be a non-negative number.');
      return;
    }

    this.ingesting.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/ingest/sources`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          reading: {
            sourceId: this.readingSourceId,
            timestamp: this.readingDate,
            periodVolume,
            notes: this.readingNotes.trim() || null,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Reading save failed (${res.status})`);
        return;
      }
      this.status.set(
        `Saved period reading for ${body.reading?.sourceName ?? 'source'}: ${periodVolume.toLocaleString()} gal.`,
      );
      this.readingVolume = '';
      this.readingNotes = '';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.ingesting.set(false);
    }
  }

  async ingestCsv(dryRun = false): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to import source readings.');
      return;
    }
    if (!this.csvText.trim()) {
      this.error.set('Load a source CSV first.');
      return;
    }

    this.ingesting.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/ingest/sources`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ csvText: this.csvText, dryRun }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Import failed (${res.status})`);
        return;
      }
      if (dryRun) {
        this.status.set(`Check OK — ${body.rowCount ?? 0} row(s) ready to import.`);
        return;
      }
      this.status.set(
        `Imported ${body.readingsWritten ?? 0} source reading(s)` +
          (body.sourcesCreated ? `; created ${body.sourcesCreated} source(s)` : '') +
          '.',
      );
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.ingesting.set(false);
    }
  }
}
