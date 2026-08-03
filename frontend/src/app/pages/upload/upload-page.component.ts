import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import * as XLSX from 'xlsx';
import { AuthService } from '../../core/auth.service';
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
  | 'diagnosticFlags'
  | 'manufacturer'
  | 'model'
  | 'serialNumber'
  | 'meterSize'
  | 'installDate'
  | 'radioId';

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
  manufacturer: 'Manufacturer',
  model: 'Model',
  serialNumber: 'Serial number',
  meterSize: 'Meter size',
  installDate: 'Install date',
  radioId: 'Radio / endpoint ID',
};

/** Keep in sync with backend HEADER_ALIASES (csv-parse) for preview guesses. */
const ALIASES: Record<CanonicalField, string[]> = {
  meterId: ['meter id', 'meterid', 'meter #', 'meter number', 'meter', 'meter no'],
  serviceAddress: [
    'service address',
    'address',
    'location',
    'service location',
    'location address',
    'location / address',
  ],
  occupantName: ['customer', 'customer name', 'occupant', 'name', 'owner'],
  accountNumber: ['account #', 'account', 'account number', 'acct', 'acct #'],
  timestamp: ['read date', 'reading date', 'date', 'timestamp', 'read dt'],
  cumulativeReading: [
    'reading (gal)',
    'reading',
    'cumulative',
    'gallons',
    'current reading',
    'reading gal',
  ],
  unit: ['unit', 'units'],
  route: ['route', 'route #'],
  diagnosticFlags: [
    'diag',
    'diagnostic',
    'flags',
    'flag',
    'flag alarm',
    'flag / alarm',
    'alarm',
  ],
  manufacturer: ['manufacturer', 'mfr', 'make', 'meter manufacturer', 'meter make'],
  model: ['model', 'meter model', 'model number', 'model #'],
  serialNumber: ['serial', 'serial number', 'serial #', 'serial no', 'meter serial', 'sn'],
  meterSize: ['meter size', 'size', 'size (in)', 'size in', 'meter_size'],
  installDate: [
    'install date',
    'installed',
    'date installed',
    'installation date',
    'install dt',
  ],
  radioId: ['radio id', 'radio', 'endpoint id', 'endpoint', 'ami id', 'ami', 'mxu'],
};

/** Match backend MAX_EXCEL_BYTES — API JSON+base64 cannot carry 20MB workbooks. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface SheetOption {
  label: string;
  value: string;
  dataSheet: boolean;
}

@Component({
  selector: 'app-upload-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    FileUploadModule,
    MessageModule,
    SelectModule,
    CheckboxModule,
  ],
  templateUrl: './upload-page.component.html',
  styleUrl: './upload-page.component.scss',
})
export class UploadPageComponent {
  readonly auth = inject(AuthService);

  readonly fieldLabels = FIELD_LABELS;
  readonly fields = Object.keys(FIELD_LABELS) as CanonicalField[];
  readonly sampleHint =
    'Try sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx — or messy-readings-july.csv. Address stays with the meter; names may change.';

  headers: string[] = [];
  mapping: Partial<Record<CanonicalField, string>> = {};
  csvText = '';
  excelBase64 = '';
  fileName = '';
  isExcel = false;
  sheetOptions: SheetOption[] = [];
  selectedSheet: string | null = null;
  mergeArchive = false;
  workbook: XLSX.WorkBook | null = null;
  previewRows: Record<string, string>[] = [];
  statusMessage = '';
  statusSeverity: 'info' | 'success' | 'warn' | 'error' = 'info';
  busy = false;
  /** B6 — operator-facing ingest phase. */
  ingestPhase: 'idle' | 'loaded' | 'mapped' | 'dry_run_ok' | 'committed' | 'failed' = 'idle';
  ingestWarnings: string[] = [];
  lastStatusFriendly = '';
  /** H2 — summary rows after multi-file bulk load. */
  queue: Array<{ name: string; status: string; ok: boolean }> = [];

  onCustomUpload(event: FileUploadHandlerEvent): void {
    const files = event.files ?? [];
    if (!files.length) return;
    if (files.length > 1) {
      void this.ingestFileQueue([...files]);
      return;
    }
    this.beginLoadFile(files[0]);
  }

  private beginLoadFile(file: File): void {
    this.fileName = file.name;
    this.isExcel = /\.xlsx?$/i.test(file.name);
    this.statusMessage = '';
    this.mergeArchive = false;
    this.ingestWarnings = [];
    this.ingestPhase = 'idle';

    if (file.size > MAX_UPLOAD_BYTES) {
      this.statusMessage = `File is too large (${Math.round(file.size / 1024 / 1024)} MB). Max is 5 MB for Upload — use a smaller export or the S3 drop-zone.`;
      this.statusSeverity = 'warn';
      this.ingestPhase = 'failed';
      this.lastStatusFriendly = this.statusMessage;
      this.headers = [];
      this.previewRows = [];
      this.excelBase64 = '';
      this.csvText = '';
      this.sheetOptions = [];
      return;
    }

    if (this.isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result;
        if (!(data instanceof ArrayBuffer)) {
          this.statusMessage = 'Could not read Excel file.';
          this.statusSeverity = 'error';
          this.ingestPhase = 'failed';
          return;
        }
        const bytes = new Uint8Array(data);
        this.excelBase64 = this.bytesToBase64(bytes);
        this.workbook = XLSX.read(bytes, {
          type: 'array',
          cellDates: true,
          sheetRows: 50_000,
        });
        this.sheetOptions = this.workbook.SheetNames.map((name) => ({
          label: this.sheetLabel(name),
          value: name,
          dataSheet: !/clerk\s*notes|internal\s*notes/i.test(name),
        })).filter((s) => s.dataSheet);
        const preferred =
          this.sheetOptions.find((s) => /meter\s*reads|july/i.test(s.value) && !/archive/i.test(s.value)) ??
          this.sheetOptions[0] ??
          null;
        this.selectedSheet = preferred?.value ?? null;
        this.csvText = '';
        if (this.selectedSheet) {
          this.loadSelectedSheet();
          this.ingestPhase = 'mapped';
          this.statusMessage = `Loaded ${file.name}. Choose a sheet, review mapping, then dry run.`;
          this.statusSeverity = 'info';
          this.lastStatusFriendly = this.statusMessage;
        } else {
          this.statusMessage = 'No meter-data sheets found (Clerk Notes alone is ignored).';
          this.statusSeverity = 'warn';
          this.ingestPhase = 'failed';
          this.lastStatusFriendly = this.statusMessage;
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    this.excelBase64 = '';
    this.workbook = null;
    this.sheetOptions = [];
    this.selectedSheet = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.csvText = String(reader.result ?? '');
      this.preparePreview(this.csvText);
      this.ingestPhase = this.headers.length ? 'mapped' : 'loaded';
      this.statusMessage = 'File loaded. Review column mapping, then dry run.';
      this.statusSeverity = 'info';
      this.lastStatusFriendly = this.statusMessage;
    };
    reader.readAsText(file);
  }

  /** Wait until FileReader finishes for queue processing. */
  private waitUntilLoaded(timeoutMs = 4000): Promise<boolean> {
    const start = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (this.ingestPhase === 'mapped' || this.ingestPhase === 'loaded') {
          resolve(true);
          return;
        }
        if (this.ingestPhase === 'failed' || Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  }

  /** H2 multi-file historical load — sequential commit + “what we loaded” summary. */
  private async ingestFileQueue(files: File[]): Promise<void> {
    this.queue = [];
    this.busy = true;
    this.statusSeverity = 'info';
    this.statusMessage = `Bulk load: ${files.length} files (max 5 MB each)…`;
    for (const file of files) {
      this.beginLoadFile(file);
      const loaded = await this.waitUntilLoaded();
      if (!loaded || (!this.csvText.trim() && !this.excelBase64)) {
        this.queue.push({ name: file.name, status: this.statusMessage || 'Failed to load', ok: false });
        continue;
      }
      await this.ingest(false);
      this.queue.push({
        name: file.name,
        status: this.lastStatusFriendly || this.statusMessage,
        ok: this.ingestPhase === 'committed',
      });
    }
    const okCount = this.queue.filter((q) => q.ok).length;
    this.statusMessage = `Bulk load finished — ${okCount} of ${files.length} file(s) imported.`;
    this.statusSeverity = okCount === files.length ? 'success' : 'warn';
    this.lastStatusFriendly = this.statusMessage;
    this.busy = false;
  }

  onSheetChange(): void {
    this.loadSelectedSheet();
  }

  loadSelectedSheet(): void {
    if (!this.workbook || !this.selectedSheet) return;
    const sheet = this.workbook.Sheets[this.selectedSheet];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown as string[][];
    const csv = this.matrixToCsv(matrix);
    this.csvText = csv;
    this.preparePreview(csv);
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

    // Mirror backend: find header among first ~25 lines by alias hits.
    let headerIdx = 0;
    let bestScore = 0;
    const scan = Math.min(lines.length, 25);
    for (let i = 0; i < scan; i += 1) {
      const cells = this.splitCsvLine(lines[i]).map((c) => c.trim()).filter(Boolean);
      let score = 0;
      for (const cell of cells) {
        const key = cell.toLowerCase().replace(/[_/#]+/g, ' ').replace(/\s+/g, ' ').trim();
        for (const aliases of Object.values(ALIASES)) {
          if (aliases.includes(key)) {
            score += 3;
            break;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        headerIdx = i;
      }
    }

    this.headers = this.splitCsvLine(lines[headerIdx]).map((h) => h.trim()).filter(Boolean);
    this.mapping = this.guessMapping(this.headers);
    this.previewRows = lines.slice(headerIdx + 1, headerIdx + 6).map((line) => {
      const cells = this.splitCsvLine(line);
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
      key: h.trim().toLowerCase().replace(/[_/#]+/g, ' ').replace(/\s+/g, ' ').trim(),
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
    if (!this.csvText.trim() && !this.excelBase64) {
      this.statusMessage = 'Choose a CSV or Excel file first.';
      this.statusSeverity = 'warn';
      return;
    }
    const token = this.auth.getBearerToken();
    if (!token) {
      this.statusMessage = 'Sign in to ingest readings.';
      this.statusSeverity = 'warn';
      return;
    }

    this.busy = true;
    try {
      const body: Record<string, unknown> = {
        mapping: this.mapping,
        dryRun,
      };
      if (this.isExcel && this.excelBase64) {
        body['excelBase64'] = this.excelBase64;
        body['sheetName'] = this.selectedSheet;
        body['mergeArchive'] = this.mergeArchive;
      } else {
        body['csvText'] = this.csvText;
      }

      const res = await fetch(`${environment.apiBaseUrl}/ingest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        this.ingestPhase = 'failed';
        this.ingestWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
        this.statusMessage =
          payload.status?.friendly ?? payload.error ?? `Ingest failed (${res.status})`;
        this.lastStatusFriendly = this.statusMessage;
        this.statusSeverity = 'error';
        return;
      }
      this.ingestWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
      if (payload.status?.friendly) {
        this.lastStatusFriendly = payload.status.friendly;
      }
      const sheetNote = payload.selectedSheet ? ` (sheet: ${payload.selectedSheet})` : '';
      if (dryRun) {
        this.ingestPhase = 'dry_run_ok';
        this.statusMessage =
          payload.status?.friendly ??
          `Dry run OK — ${payload.rowCount} rows would import${sheetNote}.`;
      } else {
        this.ingestPhase = 'committed';
        this.statusMessage =
          payload.status?.friendly ??
          `Imported ${payload.readingsWritten} readings across ${payload.metersTracked} meters${sheetNote}.` +
            (payload.addressConflicts?.length
              ? ` ${payload.addressConflicts.length} address conflict(s) kept on existing location.`
              : '');
      }
      this.lastStatusFriendly = this.statusMessage;
      this.statusSeverity = 'success';
    } catch (err) {
      this.ingestPhase = 'failed';
      this.statusMessage = err instanceof Error ? err.message : 'Network error';
      this.lastStatusFriendly = this.statusMessage;
      this.statusSeverity = 'error';
    } finally {
      this.busy = false;
    }
  }

  private sheetLabel(name: string): string {
    if (/archive|older/i.test(name)) return `${name} (archive)`;
    if (/meter\s*reads|july/i.test(name)) return `${name} (recommended)`;
    return name;
  }

  private matrixToCsv(matrix: string[][]): string {
    return matrix
      .map((row) =>
        (row ?? [])
          .map((cell) => {
            const s = cell == null ? '' : String(cell);
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(','),
      )
      .join('\n');
  }

  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
}
