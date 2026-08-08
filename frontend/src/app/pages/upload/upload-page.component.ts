/**
 * Customer meter upload — Kelly demo step 2.
 * Flow: pick Excel/CSV → visual column map → dry run → POST /ingest commit.
 * Preferred fixture: sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx (CSV also works).
 * Tenant from JWT only. Large bulk drops use S3 ops path (mapping already saved).
 */

import { Component, OnInit, ViewChild, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule, type FileUploadHandlerEvent } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import * as XLSX from 'xlsx';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { autoPinMissingFromApi } from '../../shared/meter-auto-pin';
import type { GeocodeBias } from '../../shared/geocode.service';
import { parseIntakeSummary } from '../../shared/intake-summary';

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
  meterId: ['meter id', 'meterid', 'meter #', 'meter number', 'meter_no', 'meter', 'meter no'],
  serviceAddress: [
    'service address',
    'address',
    'service addr',
    'location',
    'service location',
    'street address',
    'location address',
    'location / address',
  ],
  occupantName: [
    'customer',
    'customer name',
    'occupant',
    'occupant name',
    'name',
    'owner',
    'account name',
  ],
  accountNumber: ['account #', 'account', 'account number', 'acct', 'acct #', 'account_no'],
  timestamp: [
    'read date',
    'reading date',
    'date',
    'timestamp',
    'read_dt',
    'read dt',
    'reading datetime',
    'read_date',
  ],
  cumulativeReading: [
    'reading (gal)',
    'reading',
    'cumulative',
    'cumulative reading',
    'usage',
    'gallons',
    'read',
    'current reading',
    'reading gal',
    'reading_gal',
  ],
  unit: ['unit', 'units', 'uom'],
  route: ['route', 'route #', 'book', 'cycle'],
  diagnosticFlags: [
    'diag',
    'diagnostic',
    'diagnostic flag',
    'diagnostics',
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
    'install_dt',
    'install dt',
  ],
  radioId: [
    'radio id',
    'radio',
    'endpoint id',
    'endpoint',
    'ami id',
    'ami',
    'mxu',
    'transmitter id',
  ],
};

/** Match backend MAX_EXCEL_BYTES — API JSON+base64 cannot carry 20MB workbooks. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Match backend SYNC_INGEST_MAX_ROWS — larger files use background import. */
const SYNC_INGEST_MAX_ROWS = 250;

/** Browser FileReader can hang on odd blobs; fail loudly instead of stuck “Reading…”. */
const FILE_READ_TIMEOUT_MS = 20_000;

/** Tiny fixture so operators can prove map → check → import without a local file. */
const PRACTICE_CSV = `Meter ID,Read Date,Reading (gal),Account #,Customer,Service Address,Route,Diag
1042,07/15/2026,128450,A-2201,A Rivera,112 N Main St Wiley CO,R3,
1043,07/15/2026,98210,A-2202,M Lopez,45 County Rd 18 Wiley CO,R3,L
1044,7/15/26,98210,A-2203,R Chen,8 Elm Ct Wiley CO,R3,
1045,15-Jul-2026,0,A-2204,Empty Lot,210 Vacant Lot Rd Wiley CO,R4,NR
1046,07/15/2026,445890,A-2205,Irrigation HOA,Park Loop Meter Pit Wiley CO,R1,
1042,06/15/2026,125100,A-2201,J Smith,112 N Main St Wiley CO,R3,
1043,06/15/2026,97100,A-2202,M Lopez,45 County Rd 18 Wiley CO,R3,
1044,06/15/2026,96050,A-2203,R Chen,8 Elm Ct Wiley CO,R4,
1045,06/15/2026,0,A-2204,Empty Lot,210 Vacant Lot Rd Wiley CO,R4,NR
1046,06/15/2026,312000,A-2205,Irrigation HOA,Park Loop Meter Pit Wiley CO,R1,
# Notes: address stays with meter; 1042 occupant changed J Smith -> A Rivera.
`;

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
    ProgressBarModule,
    SelectModule,
    CheckboxModule,
  ],
  templateUrl: './upload-page.component.html',
  styleUrl: './upload-page.component.scss',
})
export class UploadPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Clears PrimeNG's "Pending" badge after customUpload (it never auto-clears). */
  @ViewChild('uploader') private uploader?: FileUpload;
  /** Ignore onClear when we clear the widget after a successful load. */
  private suppressClearReset = false;

  readonly fieldLabels = FIELD_LABELS;
  readonly fields = Object.keys(FIELD_LABELS) as CanonicalField[];
  readonly sampleHint =
    'Use Try practice CSV below for a quick messy sample, or choose your own Excel/CSV from QuickBooks, Caselle, or a handheld export. “Messy” columns are expected — we help map them in plain language.';
  /** Cap long skip/warning lists in the progress card. */
  readonly warningDisplayLimit = 8;

  /** From member intake — CIS / column hints (never auto-applies mapping). */
  intakeHint = signal('');

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
  ingestPhase: 'idle' | 'loading' | 'loaded' | 'mapped' | 'dry_run_ok' | 'committed' | 'failed' =
    'idle';
  ingestWarnings: string[] = [];
  lastStatusFriendly = '';
  /** Rows ready after last successful dry run (drives sync vs background import). */
  dryRunRowCount = 0;
  useBackgroundJob = false;
  /** H2 — summary rows after multi-file bulk load. */
  queue: Array<{ name: string; status: string; ok: boolean }> = [];
  /** 0–100 for determinate bar; ignored when progressMode is indeterminate. */
  progressValue = 0;
  progressMode: 'determinate' | 'indeterminate' = 'determinate';
  progressLabel = '';

  /** Headers currently assigned to a canonical field. */
  get mappedHeaders(): string[] {
    const used = new Set<string>();
    for (const v of Object.values(this.mapping)) {
      if (v) used.add(v);
    }
    return this.headers.filter((h) => used.has(h));
  }

  /** Headers present in the file but not mapped this time. */
  get unusedHeaders(): string[] {
    const used = new Set(this.mappedHeaders);
    return this.headers.filter((h) => !used.has(h));
  }

  get visibleWarnings(): string[] {
    return this.ingestWarnings.slice(0, this.warningDisplayLimit);
  }

  get hiddenWarningCount(): number {
    return Math.max(0, this.ingestWarnings.length - this.warningDisplayLimit);
  }

  onCustomUpload(event: FileUploadHandlerEvent): void {
    // Copy before clear — customUpload leaves files stuck as "Pending" otherwise.
    const files = [...(event.files ?? [])];
    if (!files.length) return;
    if (files.length > 1) {
      void this.ingestFileQueue(files);
      return;
    }
    void this.beginLoadFile(files[0]!);
  }

  /** Clear must reset progress — otherwise “Reading… 5%” can stick after cancel. */
  onUploaderClear(): void {
    if (this.suppressClearReset || this.busy) return;
    this.resetLoadState('Cleared. Choose a file or try the practice CSV.');
  }

  /** One-click sample — no file picker (helps when Choose/drop feels stuck on Pending). */
  loadPracticeCsv(): void {
    if (!this.auth.isLoggedIn()) {
      this.statusMessage = 'Sign in to import readings.';
      this.statusSeverity = 'warn';
      return;
    }
    const file = new File([PRACTICE_CSV], 'messy-readings-july.csv', {
      type: 'text/csv',
    });
    void this.beginLoadFile(file);
  }

  private resetLoadState(message: string): void {
    this.fileName = '';
    this.isExcel = false;
    this.csvText = '';
    this.excelBase64 = '';
    this.workbook = null;
    this.sheetOptions = [];
    this.selectedSheet = null;
    this.headers = [];
    this.previewRows = [];
    this.mapping = {};
    this.mergeArchive = false;
    this.ingestWarnings = [];
    this.ingestPhase = 'idle';
    this.dryRunRowCount = 0;
    this.useBackgroundJob = false;
    this.statusMessage = message;
    this.statusSeverity = 'info';
    this.lastStatusFriendly = message;
    this.setProgress(0, '');
    this.cdr.detectChanges();
  }

  private setProgress(
    value: number,
    label: string,
    mode: 'determinate' | 'indeterminate' = 'determinate',
  ): void {
    this.progressValue = Math.max(0, Math.min(100, Math.round(value)));
    this.progressLabel = label;
    this.progressMode = mode;
    this.cdr.markForCheck();
  }

  private finishCustomUploadUi(): void {
    // Removes the stuck Pending row from p-fileupload after custom handling.
    // clear() emits onClear — do not wipe the mapping we just loaded.
    this.suppressClearReset = true;
    try {
      this.uploader?.clear();
    } finally {
      this.suppressClearReset = false;
    }
    this.cdr.detectChanges();
  }

  private beginLoadFile(file: File): Promise<boolean> {
    this.fileName = file.name;
    this.isExcel = /\.xlsx?$/i.test(file.name);
    this.statusMessage = '';
    this.mergeArchive = false;
    this.ingestWarnings = [];
    this.ingestPhase = 'loading';
    this.setProgress(5, `Reading ${file.name}…`);

    if (file.size > MAX_UPLOAD_BYTES) {
      this.statusMessage = `File is too large (${Math.round(file.size / 1024 / 1024)} MB). Max is 5 MB for this upload path — split by year, or ask an admin to use the S3 drop-zone when mapping is already saved.`;
      this.statusSeverity = 'warn';
      this.ingestPhase = 'failed';
      this.lastStatusFriendly = this.statusMessage;
      this.setProgress(0, 'Load failed');
      this.headers = [];
      this.previewRows = [];
      this.excelBase64 = '';
      this.csvText = '';
      this.sheetOptions = [];
      this.finishCustomUploadUi();
      return Promise.resolve(false);
    }

    if (this.isExcel) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.finishCustomUploadUi();
          resolve(ok);
        };
        const timer = setTimeout(() => {
          try {
            reader.abort();
          } catch {
            /* ignore */
          }
          this.statusMessage =
            'Timed out reading that Excel file. Try a smaller sheet, or use Try practice CSV.';
          this.statusSeverity = 'error';
          this.ingestPhase = 'failed';
          this.setProgress(0, 'Load failed');
          finish(false);
        }, FILE_READ_TIMEOUT_MS);
        reader.onprogress = (ev) => {
          if (ev.lengthComputable && ev.total > 0) {
            this.setProgress((ev.loaded / ev.total) * 55, `Reading ${file.name}…`);
          }
        };
        reader.onerror = () => {
          this.statusMessage = 'Could not read Excel file.';
          this.statusSeverity = 'error';
          this.ingestPhase = 'failed';
          this.setProgress(0, 'Load failed');
          finish(false);
        };
        reader.onload = () => {
          const data = reader.result;
          if (!(data instanceof ArrayBuffer)) {
            this.statusMessage = 'Could not read Excel file.';
            this.statusSeverity = 'error';
            this.ingestPhase = 'failed';
            this.setProgress(0, 'Load failed');
            finish(false);
            return;
          }
          this.setProgress(70, 'Parsing workbook…');
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
            this.sheetOptions.find(
              (s) => /meter\s*reads|july/i.test(s.value) && !/archive/i.test(s.value),
            ) ??
            this.sheetOptions[0] ??
            null;
          this.selectedSheet = preferred?.value ?? null;
          this.csvText = '';
          if (this.selectedSheet) {
            this.loadSelectedSheet();
            this.ingestPhase = 'mapped';
            this.statusMessage = `Loaded ${file.name}. Choose a sheet, review mapping, then check first.`;
            this.statusSeverity = 'info';
            this.lastStatusFriendly = this.statusMessage;
            this.setProgress(100, 'Ready to map / check');
          } else {
            this.statusMessage = 'No meter-data sheets found (Clerk Notes alone is ignored).';
            this.statusSeverity = 'warn';
            this.ingestPhase = 'failed';
            this.lastStatusFriendly = this.statusMessage;
            this.setProgress(0, 'Load failed');
          }
          finish(this.ingestPhase === 'mapped');
        };
        reader.readAsArrayBuffer(file);
      });
    }

    this.excelBase64 = '';
    this.workbook = null;
    this.sheetOptions = [];
    this.selectedSheet = null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.finishCustomUploadUi();
        resolve(ok);
      };
      const timer = setTimeout(() => {
        try {
          reader.abort();
        } catch {
          /* ignore */
        }
        this.statusMessage =
          'Timed out reading that CSV. Try again, or use Try practice CSV.';
        this.statusSeverity = 'error';
        this.ingestPhase = 'failed';
        this.setProgress(0, 'Load failed');
        finish(false);
      }, FILE_READ_TIMEOUT_MS);
      reader.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          this.setProgress((ev.loaded / ev.total) * 80, `Reading ${file.name}…`);
        }
      };
      reader.onerror = () => {
        this.statusMessage = 'Could not read CSV file.';
        this.statusSeverity = 'error';
        this.ingestPhase = 'failed';
        this.setProgress(0, 'Load failed');
        finish(false);
      };
      reader.onload = () => {
        this.csvText = String(reader.result ?? '');
        this.preparePreview(this.csvText);
        this.ingestPhase = this.headers.length ? 'mapped' : 'loaded';
        this.statusMessage = 'File loaded. Review column mapping, then check first.';
        this.statusSeverity = 'info';
        this.lastStatusFriendly = this.statusMessage;
        this.setProgress(100, 'Ready to map / check');
        finish(true);
      };
      reader.readAsText(file);
    });
  }

  /** H2 multi-file historical load — sequential commit + “what we loaded” summary. */
  private async ingestFileQueue(files: File[]): Promise<void> {
    this.queue = [];
    this.busy = true;
    this.statusSeverity = 'info';
    this.statusMessage = `Bulk load: ${files.length} files (max 5 MB each)…`;
    this.setProgress(0, `Bulk load 0 of ${files.length}…`);
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      this.setProgress(
        (i / files.length) * 100,
        `Bulk load ${i + 1} of ${files.length}: ${file.name}`,
      );
      const loaded = await this.beginLoadFile(file);
      if (!loaded || (!this.csvText.trim() && !this.excelBase64)) {
        this.queue.push({
          name: file.name,
          status: this.statusMessage || 'Failed to load',
          ok: false,
        });
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
    this.setProgress(100, this.statusMessage);
    this.busy = false;
    this.finishCustomUploadUi();
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
      const cells = this.splitCsvLine(lines[i])
        .map((c) => c.trim())
        .filter(Boolean);
      let score = 0;
      for (const cell of cells) {
        const key = cell
          .toLowerCase()
          .replace(/[_/#]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
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

    this.headers = this.splitCsvLine(lines[headerIdx])
      .map((h) => h.trim())
      .filter(Boolean);
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
      key: h
        .trim()
        .toLowerCase()
        .replace(/[_/#]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
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

  /** Hand real CSV/Excel headers to /assistant for mapping suggestions (Phase D). */
  async askAssistantForMapping(): Promise<void> {
    if (!this.headers.length) return;
    const prompt = [
      'Help map these CSV headers for meter upload.',
      `headers: ${this.headers.join(', ')}`,
      'Suggest a column map. I will confirm on Upload before import.',
    ].join(' ');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ws_assistant_ask', prompt);
    }
    await this.router.navigate(['/assistant'], {
      queryParams: { deepen: '1' },
    });
  }

  ngOnInit(): void {
    void this.loadIntakeHint();
  }

  private async loadIntakeHint(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.intakeHint.set('');
      return;
    }
    try {
      const res = await fetch(`${environment.apiBaseUrl}/onboarding`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        this.intakeHint.set('');
        return;
      }
      const body = await res.json();
      const summary = parseIntakeSummary(body);
      if (!summary) {
        this.intakeHint.set('');
        return;
      }
      const bits: string[] = [];
      if (summary.pathLabel) bits.push(summary.pathLabel);
      if (summary.municipalBillingSystem) {
        bits.push(`CIS / export: ${summary.municipalBillingSystem}`);
      }
      if (summary.exportFormat && summary.exportFormat !== 'unknown') {
        bits.push(`format ${summary.exportFormat}`);
      }
      if (summary.exportColumnHints) {
        bits.push(`column hints from intake: ${summary.exportColumnHints}`);
      }
      this.intakeHint.set(
        bits.length
          ? `From member intake — ${bits.join('; ')}. Confirm mapping below before import.`
          : '',
      );
    } catch {
      this.intakeHint.set('');
    }
  }

  /** dryRun=true previews parse results; false commits locations + readings for the JWT tenant. */
  async ingest(dryRun = false): Promise<void> {
    if (!this.csvText.trim() && !this.excelBase64) {
      this.statusMessage = 'Choose an Excel or CSV file first.';
      this.statusSeverity = 'warn';
      return;
    }
    const token = this.auth.getBearerToken();
    if (!token) {
      this.statusMessage = 'Sign in to import readings.';
      this.statusSeverity = 'warn';
      return;
    }

    this.busy = true;
    const background =
      !dryRun && (this.useBackgroundJob || this.dryRunRowCount > SYNC_INGEST_MAX_ROWS);
    this.setProgress(
      dryRun ? 55 : background ? 60 : 65,
      dryRun ? 'Checking file…' : background ? 'Starting background import…' : 'Importing readings…',
      'indeterminate',
    );
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), background ? 45_000 : 60_000);
    try {
      const body: Record<string, unknown> = {
        mapping: this.mapping,
        dryRun,
        filename: this.fileName || undefined,
        idempotencyKey: dryRun ? undefined : idempotencyKey,
      };
      if (this.isExcel && this.excelBase64) {
        body['excelBase64'] = this.excelBase64;
        body['sheetName'] = this.selectedSheet;
        body['mergeArchive'] = this.mergeArchive;
      } else {
        body['csvText'] = this.csvText;
      }

      const endpoint = background ? '/ingest/jobs' : '/ingest';
      const res = await fetch(`${environment.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await res.json();

      if (res.status === 413 && payload.useBackgroundJob) {
        this.useBackgroundJob = true;
        this.dryRunRowCount = Number(payload.rowCount ?? this.dryRunRowCount);
        clearTimeout(abortTimer);
        this.busy = false;
        await this.ingest(false);
        return;
      }

      if (!res.ok) {
        if (!dryRun && (res.status === 503 || res.status === 504)) {
          const recovered = await this.tryRecoverFromTimeout(token, idempotencyKey);
          if (recovered) return;
        }
        this.ingestPhase = 'failed';
        this.ingestWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
        this.statusMessage =
          payload.status?.friendly ?? payload.error ?? `Import failed (${res.status})`;
        this.lastStatusFriendly = this.statusMessage;
        this.statusSeverity = 'error';
        this.setProgress(0, 'Import failed');
        return;
      }

      if (background && res.status === 202) {
        const jobId = String(payload.jobId ?? '');
        if (!jobId) {
          throw new Error('Background import did not return a job id');
        }
        this.statusMessage = payload.statusLine ?? 'Import queued — processing in the background…';
        this.setProgress(70, 'Background import running…');
        const finished = await this.pollIngestJob(token, jobId, controller.signal);
        await this.applyCommittedPayload(finished, token);
        return;
      }

      this.ingestWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
      const sheetNote = payload.selectedSheet ? ` (sheet: ${payload.selectedSheet})` : '';
      if (dryRun) {
        this.ingestPhase = 'dry_run_ok';
        this.dryRunRowCount = Number(payload.rowCount ?? 0);
        this.useBackgroundJob = Boolean(payload.useBackgroundJob);
        this.statusMessage =
          (payload.status?.friendly as string | undefined) ??
          `Check OK — ${payload.rowCount} rows ready to import${sheetNote}.` +
            (this.useBackgroundJob
              ? ` Large file — import will run in the background.`
              : '');
        this.setProgress(85, 'Check OK — ready to import');
      } else {
        await this.applyCommittedPayload(payload, token);
      }
      this.lastStatusFriendly = this.statusMessage;
      if (dryRun) {
        this.statusSeverity =
          typeof payload.rowsSkipped === 'number' && payload.rowsSkipped > 0 ? 'warn' : 'success';
      }
    } catch (err) {
      if (!dryRun) {
        const token = this.auth.getBearerToken();
        if (token) {
          const recovered = await this.tryRecoverFromTimeout(token);
          if (recovered) return;
        }
      }
      this.ingestPhase = 'failed';
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');
      this.statusMessage = aborted
        ? 'Import timed out — check Dashboard for recent data or try again.'
        : err instanceof Error
          ? err.message
          : 'Network error';
      this.lastStatusFriendly = this.statusMessage;
      this.statusSeverity = 'error';
      this.setProgress(0, 'Import failed');
    } finally {
      clearTimeout(abortTimer);
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  private async pollIngestJob(
    token: string,
    jobId: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const res = await fetch(`${environment.apiBaseUrl}/ingest/jobs/${encodeURIComponent(jobId)}`, {
        headers: { authorization: `Bearer ${token}` },
        signal,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? `Job poll failed (${res.status})`);
      }
      const status = String(payload.status ?? '');
      this.setProgress(
        status === 'running' ? 80 : status === 'queued' ? 72 : 90,
        payload.statusLine ?? `Import ${status}…`,
      );
      if (status === 'succeeded') {
        return {
          ...payload.summary,
          ...payload,
          readingsWritten: payload.summary?.readingsWritten ?? payload.readingsWritten,
          metersTracked: payload.summary?.metersTracked ?? payload.metersTracked,
          warnings: payload.summary?.warnings ?? payload.warnings ?? [],
          addressConflicts: payload.summary?.addressConflicts ?? payload.addressConflicts,
          status: {
            phase: 'committed',
            friendly:
              payload.statusLine ??
              `Imported ${payload.summary?.readingsWritten ?? 0} readings.`,
          },
        };
      }
      if (status === 'failed') {
        throw new Error(payload.error ?? 'Background import failed');
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Background import is taking longer than expected — check Dashboard later.');
  }

  private async applyCommittedPayload(
    payload: Record<string, unknown>,
    token: string,
  ): Promise<void> {
    this.ingestPhase = 'committed';
    const sheetNote = payload['selectedSheet'] ? ` (sheet: ${payload['selectedSheet']})` : '';
    this.statusMessage =
      (payload['status'] as { friendly?: string } | undefined)?.friendly ??
      `Imported ${payload['readingsWritten']} readings across ${payload['metersTracked']} meters${sheetNote}.` +
        (Array.isArray(payload['addressConflicts']) && payload['addressConflicts'].length
          ? ` ${payload['addressConflicts'].length} address conflict(s) kept on existing location.`
          : '');
    this.ingestWarnings = Array.isArray(payload['warnings']) ? (payload['warnings'] as string[]) : [];
    this.setProgress(92, 'Import complete — suggesting map pins…');
    this.lastStatusFriendly = this.statusMessage;
    this.statusSeverity =
      typeof payload['rowsSkipped'] === 'number' && payload['rowsSkipped'] > 0 ? 'warn' : 'success';
    await this.autoPinAfterIngest(token);
  }

  /** If API Gateway timed out, lastIngest may still show a successful commit. */
  private async tryRecoverFromTimeout(
    token: string,
    idempotencyKey?: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`${environment.apiBaseUrl}/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const me = await res.json();
      const last = me.lastIngest as
        | { at?: string; readingsWritten?: number; filename?: string | null }
        | undefined;
      if (!last?.at) return false;
      const ageMs = Date.now() - Date.parse(last.at);
      if (ageMs > 5 * 60_000) return false;
      if (this.fileName && last.filename && last.filename !== this.fileName) return false;
      this.ingestPhase = 'committed';
      this.statusMessage = `Import may have finished despite a timeout — ${last.readingsWritten ?? 0} readings recorded at ${new Date(last.at).toLocaleString()}. Refresh Dashboard to confirm.`;
      this.lastStatusFriendly = this.statusMessage;
      this.statusSeverity = 'warn';
      this.setProgress(100, 'Import likely complete');
      return true;
    } catch {
      return false;
    }
  }

  private tenantGeocodeBias(): GeocodeBias {
    const center = this.auth.mapCenter();
    const town = (center?.town ?? this.auth.placeName() ?? '').trim();
    return {
      town: town || null,
      zip: /\bwiley\b/i.test(town) ? '81092' : null,
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
      maxMiles: 35,
    };
  }

  /** After a successful import, pin meters that still lack coordinates. */
  private async autoPinAfterIngest(token: string): Promise<void> {
    try {
      const result = await autoPinMissingFromApi({
        apiBaseUrl: environment.apiBaseUrl,
        token,
        bias: this.tenantGeocodeBias(),
        onProgress: (p) => {
          if (p.total === 0) return;
          this.setProgress(
            92 + Math.round((p.done / Math.max(p.total, 1)) * 8),
            `Auto-pinning ${p.done} of ${p.total} meters…`,
          );
        },
      });
      if (result.total === 0) {
        this.setProgress(100, 'Import complete');
        return;
      }
      const pinNote =
        result.pinned > 0
          ? ` Auto-pinned ${result.pinned} meter${result.pinned === 1 ? '' : 's'} from address` +
            (result.skipped || result.failed
              ? ` (${result.skipped} no match, ${result.failed} failed).`
              : '.') +
            ' Fine-tune on Meters → Map if needed.'
          : ` Could not auto-pin ${result.total} meter${result.total === 1 ? '' : 's'} — open Meters → Map to place pins.`;
      this.statusMessage = `${this.statusMessage}${pinNote}`;
      this.lastStatusFriendly = this.statusMessage;
      this.setProgress(100, 'Import + map pins complete');
    } catch (err) {
      this.statusMessage = `${this.statusMessage} Map auto-pin skipped (${
        err instanceof Error ? err.message : 'error'
      }). Open Meters to pin later.`;
      this.lastStatusFriendly = this.statusMessage;
      this.setProgress(100, 'Import complete');
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
