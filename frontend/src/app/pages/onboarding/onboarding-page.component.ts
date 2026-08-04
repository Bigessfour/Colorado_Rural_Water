import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type OnboardingPath = 'A' | 'B' | 'C' | 'D';
type ReadingUnit = 'gal' | 'cf';
type ReadSchedule = 'manual' | 'ami' | 'mixed';
type ExportFormatHint = 'csv' | 'xlsx' | 'both' | 'unknown';

interface OnboardingIntake {
  tenantId: string;
  currentStep: number;
  completedAt: string | null;
  systemName: string;
  serviceTerritoryAddress: string;
  mapTown: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  billingClerkName: string;
  billingClerkPhone: string;
  meterCountEstimate: number | null;
  sourceCountEstimate: number | null;
  readSchedule: ReadSchedule;
  preferredUnit: ReadingUnit;
  billingCycleNote: string;
  municipalBillingSystem: string;
  exportFormat: ExportFormatHint;
  exportColumnHints: string;
  onboardingPath: OnboardingPath;
  hasHistoricalExport: boolean;
  historyNotes: string;
  updatedAt: string;
}

const STEPS = [
  'Welcome',
  'System & location',
  'Contacts',
  'System size',
  'Export / billing reads',
  'Data inventory',
] as const;

@Component({
  selector: 'app-onboarding-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    SelectModule,
  ],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
})
export class OnboardingPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly steps = STEPS;
  step = signal(0);
  busy = signal(false);
  error = signal('');
  status = signal('');
  complete = signal(false);

  intake = signal<OnboardingIntake | null>(null);

  readonly pathOptions = [
    { label: 'A — Current cycle only (Thin Confidence)', value: 'A' as OnboardingPath },
    { label: 'B — 1–6 months history (Building)', value: 'B' as OnboardingPath },
    { label: 'C — 6–18 months / two seasons (Solid path)', value: 'C' as OnboardingPath },
    { label: 'D — Multi-year archive (Strong faster)', value: 'D' as OnboardingPath },
  ];
  readonly unitOptions = [
    { label: 'Gallons', value: 'gal' as ReadingUnit },
    { label: 'Cubic feet', value: 'cf' as ReadingUnit },
  ];
  readonly scheduleOptions = [
    { label: 'Manual / handheld reads', value: 'manual' as ReadSchedule },
    { label: 'AMI / automatic', value: 'ami' as ReadSchedule },
    { label: 'Mixed', value: 'mixed' as ReadSchedule },
  ];
  readonly exportOptions = [
    { label: 'CSV', value: 'csv' as ExportFormatHint },
    { label: 'Excel (XLS/XLSX)', value: 'xlsx' as ExportFormatHint },
    { label: 'Both CSV and Excel', value: 'both' as ExportFormatHint },
    { label: 'Not sure yet', value: 'unknown' as ExportFormatHint },
  ];
  readonly cisOptions = [
    { label: 'Spreadsheet only', value: 'Spreadsheet' },
    { label: 'Tyler / Munis', value: 'Tyler' },
    { label: 'CentralSquare / CIS', value: 'CentralSquare' },
    { label: 'Other / custom', value: 'Other' },
  ];

  ngOnInit(): void {
    void this.load();
  }

  private headers(): Record<string, string> {
    const token = this.auth.getBearerToken();
    return {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async load(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/onboarding`, {
        headers: this.headers(),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Load failed (${res.status})`);
        return;
      }
      this.intake.set(body.intake as OnboardingIntake);
      this.complete.set(Boolean(body.complete));
      this.step.set(body.intake?.currentStep ?? 0);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  patch(field: Partial<OnboardingIntake>): void {
    const cur = this.intake();
    if (!cur) return;
    this.intake.set({ ...cur, ...field });
  }

  async save(advance = false, finish = false): Promise<void> {
    const cur = this.intake();
    if (!cur || !this.auth.isLoggedIn()) return;
    this.busy.set(true);
    this.error.set('');
    this.status.set('');
    const nextStep = finish ? cur.currentStep : advance ? Math.min(cur.currentStep + 1, STEPS.length - 1) : cur.currentStep;
    const payload = { ...cur, currentStep: nextStep };
    try {
      const qs = finish ? '?complete=1' : '';
      const res = await fetch(`${environment.apiBaseUrl}/onboarding${qs}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Save failed (${res.status})`);
        return;
      }
      this.intake.set(body.intake as OnboardingIntake);
      this.complete.set(Boolean(body.complete));
      this.step.set(body.intake.currentStep);
      if (finish) {
        this.status.set('Intake complete — head to Upload when you have a readings file ready.');
        void this.router.navigate(['/upload']);
        return;
      }
      if (advance) this.step.set(nextStep);
      this.status.set('Saved.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  back(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  meterCountStr(): string {
    const n = this.intake()?.meterCountEstimate;
    return n == null ? '' : String(n);
  }

  setMeterCount(v: string): void {
    const trimmed = v.trim();
    this.patch({ meterCountEstimate: trimmed === '' ? null : Number(trimmed) });
  }

  sourceCountStr(): string {
    const n = this.intake()?.sourceCountEstimate;
    return n == null ? '' : String(n);
  }

  setSourceCount(v: string): void {
    const trimmed = v.trim();
    this.patch({ sourceCountEstimate: trimmed === '' ? null : Number(trimmed) });
  }
}
