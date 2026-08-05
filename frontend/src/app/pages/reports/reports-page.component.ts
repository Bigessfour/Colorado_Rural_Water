/**
 * Reports hub — work-order CSV/XLS + printable HTML ops summary (feature 012).
 * Downloads call GET /reports/* with Bearer token; no tenant in the query string.
 */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { AuthService } from '../../core/auth.service';
import { REPORT_CATALOG, categoryLabel, type ReportProcessDef } from '../../shared/report-catalog';
import { downloadBlob, openHtmlInNewTab } from '../../shared/download.util';
import { environment } from '../../../environments/environment';

interface ReportActivityRow {
  reportId: string;
  name: string;
  format: string;
  at: string;
  status: 'success' | 'error';
  detail: string;
}

@Component({
  selector: 'app-reports-page',
  imports: [
    DatePipe,
    RouterLink,
    CardModule,
    ButtonModule,
    MessageModule,
    TableModule,
    TagModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
  ],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent {
  readonly auth = inject(AuthService);
  readonly catalog = REPORT_CATALOG;
  readonly categoryLabel = categoryLabel;

  activeTab = signal<string | number>('catalog');
  busy = signal(false);
  error = signal('');
  notice = signal('');
  activity = signal<ReportActivityRow[]>([]);

  private authHeaders(): Record<string, string> {
    const token = this.auth.getBearerToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  statusLabel(row: ReportProcessDef): string {
    if (!row.requiresAuth) return 'Ready';
    return this.auth.isLoggedIn() ? 'Ready' : 'Sign in required';
  }

  statusSeverity(row: ReportProcessDef): 'success' | 'warn' | 'secondary' {
    if (!row.requiresAuth) return 'success';
    return this.auth.isLoggedIn() ? 'success' : 'warn';
  }

  onTabChange(value: string | number | undefined): void {
    if (value !== undefined) {
      this.activeTab.set(value);
    }
  }

  lastRun(reportId: string): string {
    const hit = this.activity().find((a) => a.reportId === reportId && a.status === 'success');
    return hit ? new Date(hit.at).toLocaleString() : '—';
  }

  /** Visible catalog action label (PrimeNG p-button — not legacy pButton). */
  actionLabel(row: ReportProcessDef): string {
    switch (row.action) {
      case 'work-order-csv':
        return 'Download CSV';
      case 'work-order-xlsx':
        return 'Download Excel';
      case 'summary-html':
        return 'Open / Print PDF';
      case 'alerts-flagged-csv':
        return 'Download CSV';
      default:
        return 'Run';
    }
  }

  async runReport(row: ReportProcessDef): Promise<void> {
    switch (row.action) {
      case 'work-order-csv':
        await this.downloadWorkOrders('csv', row);
        break;
      case 'work-order-xlsx':
        await this.downloadWorkOrders('xlsx', row);
        break;
      case 'summary-html':
        await this.openSummaryReport(row);
        break;
      case 'alerts-flagged-csv':
        await this.downloadAlertsCsv(row);
        break;
    }
  }

  private logActivity(
    row: ReportProcessDef,
    format: string,
    status: 'success' | 'error',
    detail: string,
  ): void {
    this.activity.update((rows) =>
      [
        {
          reportId: row.id,
          name: row.name,
          format,
          at: new Date().toISOString(),
          status,
          detail,
        },
        ...rows,
      ].slice(0, 20),
    );
  }

  async downloadWorkOrders(format: 'csv' | 'xlsx', row?: ReportProcessDef): Promise<void> {
    const def = row ?? this.catalog.find((r) => r.action === `work-order-${format}`)!;
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to download work orders.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/reports/work-orders?format=${format}`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error ?? `Download failed (${res.status})`;
        this.error.set(msg);
        this.logActivity(def, format.toUpperCase(), 'error', msg);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      downloadBlob(blob, `work-orders-${stamp}.${ext}`);
      const msg = `Downloaded work order ${ext.toUpperCase()}.`;
      this.notice.set(msg);
      this.logActivity(def, ext.toUpperCase(), 'success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      this.error.set(msg);
      this.logActivity(def, format.toUpperCase(), 'error', msg);
    } finally {
      this.busy.set(false);
    }
  }

  async openSummaryReport(row?: ReportProcessDef): Promise<void> {
    const def = row ?? this.catalog.find((r) => r.action === 'summary-html')!;
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
        const msg = body.error ?? `Report failed (${res.status})`;
        this.error.set(msg);
        this.logActivity(def, 'HTML', 'error', msg);
        return;
      }
      const html = await res.text();
      if (!html.trim()) {
        const msg = 'Summary report was empty. Try again or refresh the dashboard first.';
        this.error.set(msg);
        this.logActivity(def, 'HTML', 'error', msg);
        return;
      }
      const opened = openHtmlInNewTab(html);
      if (!opened) {
        const msg =
          'Browser blocked the summary window. Allow pop-ups for this site, then try Open / Print PDF again.';
        this.error.set(msg);
        this.logActivity(def, 'HTML', 'error', msg);
        return;
      }
      const msg = 'Opened printable summary — use Browser Print → Save as PDF.';
      this.notice.set(msg);
      this.logActivity(def, 'HTML', 'success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      this.error.set(msg);
      this.logActivity(def, 'HTML', 'error', msg);
    } finally {
      this.busy.set(false);
    }
  }

  async downloadAlertsCsv(row?: ReportProcessDef): Promise<void> {
    const def = row ?? this.catalog.find((r) => r.action === 'alerts-flagged-csv')!;
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to export flagged meters.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts?format=csv`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        const msg = `Export failed (${res.status})`;
        this.error.set(msg);
        this.logActivity(def, 'CSV', 'error', msg);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `flagged-meters-${stamp}.csv`);
      const msg = 'Downloaded flagged meters CSV from Alerts.';
      this.notice.set(msg);
      this.logActivity(def, 'CSV', 'success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      this.error.set(msg);
      this.logActivity(def, 'CSV', 'error', msg);
    } finally {
      this.busy.set(false);
    }
  }
}
