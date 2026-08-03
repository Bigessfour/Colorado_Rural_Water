import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

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
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

interface MeterHistoryReading {
  timestamp: string;
  cumulativeReading: number;
  unit: string;
  diagnosticFlags: string[];
  occupantNameAtRead: string | null;
}

interface MeterHistoryView {
  meterId: string;
  serviceAddress: string;
  occupantName: string | null;
  readings: MeterHistoryReading[];
}

@Component({
  selector: 'app-alerts-page',
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    MessageModule,
    DialogModule,
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
  error = signal('');
  notice = signal('');

  historyVisible = signal(false);
  historyBusy = signal(false);
  history = signal<MeterHistoryView | null>(null);
  historyError = signal('');

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
      const res = await fetch(`${environment.apiBaseUrl}/alerts`, {
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
          status?: string;
          acknowledgedBy?: string | null;
          acknowledgedAt?: string | null;
        }) => ({
          id: a.id,
          mode: a.mode,
          kind: 'meter' as const,
          meterId: a.meterId,
          serviceAddress: a.serviceAddress,
          occupantName: a.occupantName ?? null,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          status: a.status ?? 'open',
          acknowledgedBy: a.acknowledgedBy ?? null,
          acknowledgedAt: a.acknowledgedAt ?? null,
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
    this.history.set(null);
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
      this.history.set({
        meterId: body.meterId,
        serviceAddress: body.serviceAddress,
        occupantName: body.occupantName ?? null,
        readings: (body.readings ?? []) as MeterHistoryReading[],
      });
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
    }
  }

  async acknowledge(alert: AlertRow): Promise<void> {
    await this.updateStatus(alert, 'acknowledge');
  }

  async resolve(alert: AlertRow): Promise<void> {
    await this.updateStatus(alert, 'resolve');
  }

  statusLabel(alert: AlertRow): string {
    if (alert.status === 'acknowledged' && alert.acknowledgedBy) {
      const when = alert.acknowledgedAt ? ` · ${formatShortWhen(alert.acknowledgedAt)}` : '';
      return `acknowledged by ${alert.acknowledgedBy}${when}`;
    }
    return alert.status;
  }

  private async updateStatus(
    alert: AlertRow,
    action: 'acknowledge' | 'resolve',
  ): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to update alerts.');
      return;
    }
    this.actionBusyId.set(alert.id);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action, alertId: alert.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.notice.set(
        action === 'resolve'
          ? 'Alert resolved and saved for your system.'
          : 'Alert acknowledged and saved for your system.',
      );
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.actionBusyId.set(null);
    }
  }
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
