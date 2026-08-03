import { Component, OnInit, inject, signal } from '@angular/core';
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

type SourceType = 'well' | 'spring' | 'purchase' | 'other';

interface WaterSourceRow {
  sourceId: string;
  name: string;
  type: SourceType;
  unit: string;
  notes: string | null;
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
  busy = signal(false);
  saving = signal(false);
  ingesting = signal(false);
  error = signal('');
  status = signal('');

  name = '';
  type: SourceType = 'well';
  notes = '';
  editingId: string | null = null;

  /** Manual period reading */
  readingSourceId = '';
  readingDate = '';
  readingVolume = '';
  readingNotes = '';

  csvText = '';
  ingestHint = 'Try sample-data/messy-source-readings-july.csv — period production volumes.';

  ngOnInit(): void {
    void this.refresh();
  }

  resetForm(): void {
    this.name = '';
    this.type = 'well';
    this.notes = '';
    this.editingId = null;
  }

  startEdit(row: WaterSourceRow): void {
    this.editingId = row.sourceId;
    this.name = row.name;
    this.type = row.type;
    this.notes = row.notes ?? '';
  }

  onSourceCsvUpload(event: FileUploadHandlerEvent): void {
    const file = event.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.csvText = String(reader.result ?? '');
      this.status.set(`Loaded ${file.name} — ready to ingest source readings.`);
    };
    reader.readAsText(file);
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
      this.sources.set((body.sources ?? []) as WaterSourceRow[]);
      this.status.set(`${body.count ?? 0} named source(s) for your system.`);
      if (!this.readingSourceId && body.sources?.[0]?.sourceId) {
        this.readingSourceId = body.sources[0].sourceId;
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
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

    this.saving.set(true);
    this.error.set('');
    try {
      const payload = {
        name: this.name.trim(),
        type: this.type,
        notes: this.notes.trim() || null,
        unit: 'gal',
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
      this.error.set('Sign in to ingest source readings.');
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
        this.error.set(body.error ?? `Ingest failed (${res.status})`);
        return;
      }
      if (dryRun) {
        this.status.set(`Dry run OK — ${body.rowCount ?? 0} row(s) would be written.`);
        return;
      }
      this.status.set(
        `Ingested ${body.readingsWritten ?? 0} source reading(s)` +
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
