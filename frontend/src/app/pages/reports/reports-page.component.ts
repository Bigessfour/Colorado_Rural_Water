import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';
import { downloadBlob, openHtmlInNewTab } from '../../shared/download.util';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reports-page',
  imports: [RouterLink, CardModule, ButtonModule, MessageModule],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent {
  readonly auth = inject(AuthService);

  busy = signal(false);
  error = signal('');
  notice = signal('');

  private authHeaders(): Record<string, string> {
    const token = this.auth.getBearerToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async downloadWorkOrders(format: 'csv' | 'xlsx'): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to download work orders.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/reports/work-orders?format=${format}`,
        { headers: this.authHeaders() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.error.set(body.error ?? `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      downloadBlob(blob, `work-orders-${stamp}.${ext}`);
      this.notice.set(
        `Downloaded work order ${ext.toUpperCase()} — flagged meters with addresses, map links, and field actions.`,
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  async openSummaryReport(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to open the operations summary.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/reports/summary?format=html`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.error.set(body.error ?? `Report failed (${res.status})`);
        return;
      }
      const html = await res.text();
      openHtmlInNewTab(html);
      this.notice.set('Opened printable summary — use your browser Print → Save as PDF.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }
}
