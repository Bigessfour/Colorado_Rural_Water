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
        `${body.confidence?.level ?? '—'} (~${body.confidence?.monthsOfHistory ?? 0} mo) — ${body.confidence?.plainLanguage ?? ''}`,
      );
      this.alerts.set(
        (body.alerts ?? []).map(
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
            meterId: a.meterId,
            serviceAddress: a.serviceAddress,
            summary: a.summary,
            confidenceNote: a.confidenceNote,
            status: a.status ?? 'open',
          }),
        ),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  async acknowledge(alert: AlertRow): Promise<void> {
    alert.status = 'acknowledged';
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
