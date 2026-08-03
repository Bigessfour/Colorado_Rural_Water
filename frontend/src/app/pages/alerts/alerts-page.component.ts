import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { MeterUsageVizComponent } from '../../shared/meter-usage-viz.component';

interface AlertRow {
  id: string;
  mode: 'Watch' | 'Actionable';
  kind: 'meter' | 'balance';
  meterId: string;
  serviceAddress?: string;
  occupantName?: string | null;
  summary: string;
  status: string;
  confidenceNote: string;
  plainLanguage?: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  actionNote: string | null;
}

interface AlertActivityRow {
  eventId: string;
  alertId: string;
  action: string;
  status: string;
  actorEmail: string;
  note: string | null;
  summary: string | null;
  createdAt: string;
}

type AlertAction = 'accept' | 'dispatch' | 'resolve';

interface MeterHistoryReading {
  timestamp: string;
  cumulativeReading: number;
  unit: string;
  diagnosticFlags: string[];
  occupantNameAtRead: string | null;
}

interface MeterMetadataForm {
  occupantName: string;
  accountNumber: string;
  route: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  meterSize: string;
  installDate: string;
  meterType: string;
  locationDetail: string;
  radioId: string;
  lastTestedAt: string;
  notes: string;
}

interface MeterHistoryView {
  meterId: string;
  serviceAddress: string;
  occupantName: string | null;
  accountNumber: string | null;
  route: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  meterSize: string | null;
  installDate: string | null;
  meterType: string | null;
  locationDetail: string | null;
  radioId: string | null;
  lastTestedAt: string | null;
  notes: string | null;
  readings: MeterHistoryReading[];
  alertActivity: AlertActivityRow[];
}

@Component({
  selector: 'app-alerts-page',
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    MessageModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    MeterUsageVizComponent,
  ],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss',
})
export class AlertsPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  alerts = signal<AlertRow[]>([]);
  confidenceNote = signal('Sign in to load alerts for your system.');
  busy = signal(false);
  exportBusy = signal(false);
  actionBusyId = signal<string | null>(null);
  explainBusyId = signal<string | null>(null);
  error = signal('');
  notice = signal('');

  historyVisible = signal(false);
  historyBusy = signal(false);
  history = signal<MeterHistoryView | null>(null);
  historyError = signal('');
  historyNotice = signal('');
  saveBusy = signal(false);
  metaForm = signal<MeterMetadataForm>(emptyMetaForm());

  actionVisible = signal(false);
  actionAlert = signal<AlertRow | null>(null);
  actionNote = signal('');
  actionBusy = signal(false);

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to load live alerts.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts?explain=1`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.confidenceNote.set(
        `${body.confidence?.level ?? '—'} (~${body.confidence?.monthsOfHistory ?? 0} mo, ${body.confidence?.coveragePct ?? 0}% coverage) — ${body.confidence?.plainLanguage ?? ''}`,
      );
      const meterRows: AlertRow[] = (body.alerts ?? []).map(
        (a: {
          id: string;
          mode: 'Watch' | 'Actionable';
          meterId: string;
          serviceAddress?: string;
          occupantName?: string | null;
          summary: string;
          confidenceNote: string;
          plainLanguage?: string;
          status?: string;
          acknowledgedBy?: string | null;
          acknowledgedAt?: string | null;
          actionNote?: string | null;
        }) => ({
          id: a.id,
          mode: a.mode,
          kind: 'meter' as const,
          meterId: a.meterId,
          serviceAddress: a.serviceAddress,
          occupantName: a.occupantName ?? null,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          plainLanguage: a.plainLanguage,
          status: a.status ?? 'open',
          acknowledgedBy: a.acknowledgedBy ?? null,
          acknowledgedAt: a.acknowledgedAt ?? null,
          actionNote: a.actionNote ?? null,
        }),
      );
      const balanceRows: AlertRow[] = (body.balanceAlerts ?? []).map(
        (a: {
          id: string;
          mode?: 'Watch' | 'Actionable';
          summary: string;
          confidenceNote: string;
          periodLabel?: string;
          status?: string;
          acknowledgedBy?: string | null;
          acknowledgedAt?: string | null;
          actionNote?: string | null;
        }) => ({
          id: a.id,
          mode: a.mode ?? 'Watch',
          kind: 'balance' as const,
          meterId: 'Balance',
          serviceAddress: a.periodLabel,
          occupantName: null,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          status: a.status ?? 'open',
          acknowledgedBy: a.acknowledgedBy ?? null,
          acknowledgedAt: a.acknowledgedAt ?? null,
          actionNote: a.actionNote ?? null,
        }),
      );
      this.alerts.set([...balanceRows, ...meterRows]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  async exportFlaggedCsv(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to export flagged meters.');
      return;
    }
    this.exportBusy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts?format=csv`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = `Export failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          /* non-JSON error body */
        }
        this.error.set(message);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `flagged-meters-${stamp}.csv`);
      this.notice.set(
        'Downloaded flagged meters CSV (includes Confidence note on Watch rows).',
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.exportBusy.set(false);
    }
  }

  async openHistory(alert: AlertRow): Promise<void> {
    if (alert.kind !== 'meter') return;
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to view meter history.');
      return;
    }
    this.historyVisible.set(true);
    this.historyBusy.set(true);
    this.historyError.set('');
    this.historyNotice.set('');
    this.history.set(null);
    this.metaForm.set(emptyMetaForm());
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(alert.meterId)}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const body = await res.json();
      if (!res.ok) {
        this.historyError.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      const readings = (body.readings ?? []) as MeterHistoryReading[];
      const view: MeterHistoryView = {
        meterId: body.meterId,
        serviceAddress: body.serviceAddress,
        occupantName: body.occupantName ?? null,
        accountNumber: body.accountNumber ?? null,
        route: body.route ?? null,
        manufacturer: body.manufacturer ?? null,
        model: body.model ?? null,
        serialNumber: body.serialNumber ?? null,
        meterSize: body.meterSize ?? null,
        installDate: body.installDate ?? null,
        meterType: body.meterType ?? null,
        locationDetail: body.locationDetail ?? null,
        radioId: body.radioId ?? null,
        lastTestedAt: body.lastTestedAt ?? null,
        notes: body.notes ?? null,
        readings,
        alertActivity: (body.alertActivity ?? []) as AlertActivityRow[],
      };
      this.history.set(view);
      this.metaForm.set(formFromHistory(view));
    } catch (err) {
      this.historyError.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.historyBusy.set(false);
    }
  }

  onHistoryVisibleChange(visible: boolean): void {
    this.historyVisible.set(visible);
    if (!visible) {
      this.history.set(null);
      this.historyError.set('');
      this.historyNotice.set('');
      this.metaForm.set(emptyMetaForm());
    }
  }

  updateMetaField<K extends keyof MeterMetadataForm>(key: K, value: MeterMetadataForm[K]): void {
    this.metaForm.update((f) => ({ ...f, [key]: value }));
  }

  async saveMetadata(): Promise<void> {
    const h = this.history();
    const token = this.auth.getBearerToken();
    if (!h || !token) {
      this.historyError.set('Sign in to save meter metadata.');
      return;
    }
    this.saveBusy.set(true);
    this.historyError.set('');
    this.historyNotice.set('');
    const form = this.metaForm();
    const body = {
      occupantName: nullIfBlank(form.occupantName),
      accountNumber: nullIfBlank(form.accountNumber),
      route: nullIfBlank(form.route),
      manufacturer: nullIfBlank(form.manufacturer),
      model: nullIfBlank(form.model),
      serialNumber: nullIfBlank(form.serialNumber),
      meterSize: nullIfBlank(form.meterSize),
      installDate: nullIfBlank(form.installDate),
      meterType: nullIfBlank(form.meterType),
      locationDetail: nullIfBlank(form.locationDetail),
      radioId: nullIfBlank(form.radioId),
      lastTestedAt: nullIfBlank(form.lastTestedAt),
      notes: nullIfBlank(form.notes),
    };
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(h.meterId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      const resBody = await res.json();
      if (!res.ok) {
        this.historyError.set(resBody.error ?? `Save failed (${res.status})`);
        return;
      }
      const updated: MeterHistoryView = {
        ...h,
        occupantName: resBody.occupantName ?? null,
        accountNumber: resBody.accountNumber ?? null,
        route: resBody.route ?? null,
        manufacturer: resBody.manufacturer ?? null,
        model: resBody.model ?? null,
        serialNumber: resBody.serialNumber ?? null,
        meterSize: resBody.meterSize ?? null,
        installDate: resBody.installDate ?? null,
        meterType: resBody.meterType ?? null,
        locationDetail: resBody.locationDetail ?? null,
        radioId: resBody.radioId ?? null,
        lastTestedAt: resBody.lastTestedAt ?? null,
        notes: resBody.notes ?? null,
      };
      this.history.set(updated);
      this.metaForm.set(formFromHistory(updated));
      this.historyNotice.set('Meter metadata saved for your system.');
    } catch (err) {
      this.historyError.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.saveBusy.set(false);
    }
  }

  openAction(alert: AlertRow): void {
    this.actionAlert.set(alert);
    this.actionNote.set(alert.actionNote ?? '');
    this.actionVisible.set(true);
    this.error.set('');
    this.notice.set('');
  }

  onActionVisibleChange(visible: boolean): void {
    this.actionVisible.set(visible);
    if (!visible) {
      this.actionAlert.set(null);
      this.actionNote.set('');
    }
  }

  async submitAction(action: AlertAction): Promise<void> {
    const alert = this.actionAlert();
    if (!alert) return;
    await this.updateStatus(alert, action, this.actionNote());
    if (!this.error()) {
      this.actionVisible.set(false);
      this.actionAlert.set(null);
      this.actionNote.set('');
    }
  }

  activityLabel(action: string): string {
    if (action === 'accept' || action === 'acknowledge') return 'Accepted';
    if (action === 'dispatch') return 'Dispatched';
    if (action === 'resolve') return 'Resolved';
    return action;
  }

  async explain(alert: AlertRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to explain alerts.');
      return;
    }
    this.explainBusyId.set(alert.id);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts/explain`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertId: alert.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Explain failed (${res.status})`);
        return;
      }
      const text = body.explanation?.plainLanguage as string | undefined;
      if (!text) {
        this.error.set('No explanation returned.');
        return;
      }
      this.alerts.update((rows) =>
        rows.map((r) => (r.id === alert.id ? { ...r, plainLanguage: text } : r)),
      );
      this.notice.set(
        body.explanation?.source === 'bedrock'
          ? 'Explanation refreshed with Bedrock (Nova Lite).'
          : 'Plain-language explanation ready (template).',
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.explainBusyId.set(null);
    }
  }

  statusLabel(alert: AlertRow): string {
    const when = alert.acknowledgedAt ? ` · ${formatShortWhen(alert.acknowledgedAt)}` : '';
    const note = alert.actionNote ? ` — ${alert.actionNote}` : '';
    if (alert.status === 'acknowledged' && alert.acknowledgedBy) {
      return `accepted by ${alert.acknowledgedBy}${when}${note}`;
    }
    if (alert.status === 'dispatched' && alert.acknowledgedBy) {
      return `dispatched by ${alert.acknowledgedBy}${when}${note}`;
    }
    if (alert.status === 'resolved' && alert.acknowledgedBy) {
      return `resolved by ${alert.acknowledgedBy}${when}${note}`;
    }
    return alert.status;
  }

  private async updateStatus(
    alert: AlertRow,
    action: AlertAction,
    note = '',
  ): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to update alerts.');
      return;
    }
    this.actionBusyId.set(alert.id);
    this.actionBusy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          alertId: alert.id,
          note: note.trim() || undefined,
          meterId: alert.kind === 'meter' ? alert.meterId : undefined,
          summary: alert.summary,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      const labels: Record<AlertAction, string> = {
        accept:
          alert.kind === 'meter'
            ? 'Alert accepted and saved for your system.'
            : 'Balance alert accepted and saved for your system.',
        dispatch:
          alert.kind === 'meter'
            ? 'Crew / follow-up dispatched — saved on this meter’s history.'
            : 'Balance alert marked dispatched and saved for your system.',
        resolve:
          alert.kind === 'meter'
            ? 'Alert marked resolved with action taken — saved on meter history.'
            : 'Balance alert marked resolved and saved for your system.',
      };
      this.notice.set(labels[action]);
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.actionBusyId.set(null);
      this.actionBusy.set(false);
    }
  }
}

function emptyMetaForm(): MeterMetadataForm {
  return {
    occupantName: '',
    accountNumber: '',
    route: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    meterSize: '',
    installDate: '',
    meterType: '',
    locationDetail: '',
    radioId: '',
    lastTestedAt: '',
    notes: '',
  };
}

function formFromHistory(h: MeterHistoryView): MeterMetadataForm {
  return {
    occupantName: h.occupantName ?? '',
    accountNumber: h.accountNumber ?? '',
    route: h.route ?? '',
    manufacturer: h.manufacturer ?? '',
    model: h.model ?? '',
    serialNumber: h.serialNumber ?? '',
    meterSize: h.meterSize ?? '',
    installDate: (h.installDate ?? '').slice(0, 10),
    meterType: h.meterType ?? '',
    locationDetail: h.locationDetail ?? '',
    radioId: h.radioId ?? '',
    lastTestedAt: (h.lastTestedAt ?? '').slice(0, 10),
    notes: h.notes ?? '',
  };
}

function nullIfBlank(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

function formatShortWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
