import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { environment } from '../../../environments/environment';

type CanonicalField =
  | 'meterId'
  | 'serviceAddress'
  | 'occupantName'
  | 'accountNumber'
  | 'timestamp'
  | 'cumulativeReading'
  | 'unit'
  | 'route'
  | 'diagnosticFlags';

const FIELD_LABELS: Record<CanonicalField, string> = {
  meterId: 'Meter ID',
  serviceAddress: 'Service address (stable)',
  occupantName: 'Occupant / customer name',
  accountNumber: 'Account number',
  timestamp: 'Read date',
  cumulativeReading: 'Reading',
  unit: 'Unit',
  route: 'Route',
  diagnosticFlags: 'Diagnostic flags',
};

const ALIASES: Record<CanonicalField, string[]> = {
  meterId: ['meter id', 'meterid', 'meter #', 'meter number', 'meter'],
  serviceAddress: ['service address', 'address', 'location', 'service location'],
  occupantName: ['customer', 'customer name', 'occupant', 'name', 'owner'],
  accountNumber: ['account #', 'account', 'account number', 'acct #'],
  timestamp: ['read date', 'reading date', 'date', 'timestamp'],
  cumulativeReading: ['reading (gal)', 'reading', 'cumulative', 'gallons'],
  unit: ['unit', 'units'],
  route: ['route', 'route #'],
  diagnosticFlags: ['diag', 'diagnostic', 'flags'],
};

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [FormsModule, CardModule, ButtonModule, FileUploadModule, MessageModule],
  templateUrl: './upload-page.component.html',
  styleUrl: './upload-page.component.scss',
})
export class UploadPageComponent {
  readonly fieldLabels = FIELD_LABELS;
  readonly fields = Object.keys(FIELD_LABELS) as CanonicalField[];
  readonly sampleHint =
    'Try sample-data/messy-readings-july.csv — address stays with the meter; names may change.';

  headers: string[] = [];
  mapping: Partial<Record<CanonicalField, string>> = {};
  csvText = '';
  previewRows: Record<string, string>[] = [];
  statusMessage = '';
  statusSeverity: 'info' | 'success' | 'warn' | 'error' = 'info';
  authToken = '';
  busy = false;

  onCustomUpload(event: FileUploadHandlerEvent): void {
    const file = event.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.csvText = String(reader.result ?? '');
      this.preparePreview(this.csvText);
      this.statusMessage = 'File loaded. Review column mapping, then ingest.';
      this.statusSeverity = 'info';
    };
    reader.readAsText(file);
  }

  preparePreview(text: string): void {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'));
    if (!lines.length) {
      this.headers = [];
      this.previewRows = [];
      return;
    }
    this.headers = lines[0].split(',').map((h) => h.trim());
    this.mapping = this.guessMapping(this.headers);
    this.previewRows = lines.slice(1, 6).map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      this.headers.forEach((h, i) => {
        row[h] = (cells[i] ?? '').trim();
      });
      return row;
    });
  }

  guessMapping(headers: string[]): Partial<Record<CanonicalField, string>> {
    const mapping: Partial<Record<CanonicalField, string>> = {};
    const norm = headers.map((h) => ({
      raw: h,
      key: h.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' '),
    }));
    const used = new Set<string>();
    for (const field of this.fields) {
      const hit = norm.find((h) => !used.has(h.raw) && ALIASES[field].includes(h.key));
      if (hit) {
        mapping[field] = hit.raw;
        used.add(hit.raw);
      }
    }
    return mapping;
  }

  async ingest(dryRun = false): Promise<void> {
    if (!this.csvText.trim()) {
      this.statusMessage = 'Choose a CSV first.';
      this.statusSeverity = 'warn';
      return;
    }
    if (!this.authToken.trim()) {
      this.statusMessage =
        'Paste a Cognito ID token to call the API (SPA login lands with auth wiring).';
      this.statusSeverity = 'warn';
      return;
    }

    this.busy = true;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/ingest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.authToken.trim()}`,
        },
        body: JSON.stringify({
          csvText: this.csvText,
          mapping: this.mapping,
          dryRun,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.statusMessage = body.error ?? `Ingest failed (${res.status})`;
        this.statusSeverity = 'error';
        return;
      }
      this.statusMessage = dryRun
        ? `Dry run OK — ${body.rowCount} rows would import.`
        : `Imported ${body.readingsWritten} readings across ${body.metersTracked} meters.` +
          (body.addressConflicts?.length
            ? ` ${body.addressConflicts.length} address conflict(s) kept on existing location.`
            : '');
      this.statusSeverity = 'success';
    } catch (err) {
      this.statusMessage = err instanceof Error ? err.message : 'Network error';
      this.statusSeverity = 'error';
    } finally {
      this.busy = false;
    }
  }
}
