import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

interface AlertRow {
  id: string;
  mode: 'Watch' | 'Actionable';
  kind: 'meter' | 'balance';
  meterId: string;
  serviceAddress?: string;
  summary: string;
  status: string;
  confidenceNote: string;
}

@Component({
  selector: 'app-alerts-page',
  imports: [RouterLink, CardModule, ButtonModule, TagModule, TableModule, MessageModule],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss',
})
export class AlertsPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  alerts = signal<AlertRow[]>([]);
  confidenceNote = signal('Sign in to load alerts for your system.');
  busy = signal(false);
  error = signal('');

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
          summary: string;
          confidenceNote: string;
          status?: string;
        }) => ({
          id: a.id,
          mode: a.mode,
          kind: 'meter' as const,
          meterId: a.meterId,
          serviceAddress: a.serviceAddress,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          status: a.status ?? 'open',
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
        }) => ({
          id: a.id,
          mode: a.mode ?? 'Watch',
          kind: 'balance' as const,
          meterId: 'Balance',
          serviceAddress: a.periodLabel,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          status: a.status ?? 'open',
        }),
      );
      this.alerts.set([...balanceRows, ...meterRows]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  async acknowledge(alert: AlertRow): Promise<void> {
    this.alerts.update((rows) =>
      rows.map((r) => (r.id === alert.id ? { ...r, status: 'acknowledged' } : r)),
    );
    const token = this.auth.getBearerToken();
    if (!token) return;
    await fetch(`${environment.apiBaseUrl}/alerts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'acknowledge', alertId: alert.id }),
    });
  }
}
