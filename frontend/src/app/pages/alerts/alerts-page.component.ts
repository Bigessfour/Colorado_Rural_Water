import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
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
  standalone: true,
  imports: [FormsModule, CardModule, ButtonModule, TagModule, TableModule, MessageModule],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss',
})
export class AlertsPageComponent implements OnInit {
  alerts = signal<AlertRow[]>([]);
  confidenceNote = signal('Load alerts with a Cognito token after ingest.');
  authToken = '';
  busy = false;
  error = '';

  ngOnInit(): void {
    const saved = sessionStorage.getItem('ws_id_token');
    if (saved) {
      this.authToken = saved;
      void this.refresh();
    }
  }

  async refresh(): Promise<void> {
    if (!this.authToken.trim()) {
      this.error = 'Paste a Cognito ID token (same as Upload page) to load live alerts.';
      return;
    }
    this.busy = true;
    this.error = '';
    sessionStorage.setItem('ws_id_token', this.authToken.trim());
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts`, {
        headers: { authorization: `Bearer ${this.authToken.trim()}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error = body.error ?? `Failed (${res.status})`;
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
      this.error = err instanceof Error ? err.message : 'Network error';
    } finally {
      this.busy = false;
    }
  }

  async acknowledge(alert: AlertRow): Promise<void> {
    alert.status = 'acknowledged';
    if (!this.authToken.trim()) return;
    await fetch(`${environment.apiBaseUrl}/alerts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.authToken.trim()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'acknowledge', alertId: alert.id }),
    });
  }
}
