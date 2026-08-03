import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

export type ConfidenceLevel = 'Thin' | 'Building' | 'Solid' | 'Strong';

interface LiveAlert {
  id: string;
  mode: 'Watch' | 'Actionable';
  meterId: string;
  serviceAddress?: string;
  summary: string;
  confidenceNote: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CardModule, TagModule, ChartModule, DecimalPipe, MessageModule, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  kpis = signal([
    { label: 'Meters monitored', value: '—', hint: 'After first upload' },
    { label: 'Open alerts', value: '—', hint: 'Sign in to refresh' },
    { label: 'Water balance', value: '8.4%', hint: 'Unaccounted (demo)' },
    { label: 'Data Confidence', value: '—', hint: 'History depth, not leak %' },
  ]);

  confidence = signal({
    level: 'Thin' as ConfidenceLevel,
    displayScore: 28,
    monthsComparable: 0,
    coveragePct: 0,
    seasonality: 'Unknown until more cycles',
    meaning:
      'Confidence measures how much comparable history and meter coverage we have — not how sure we are of a leak.',
    guidance: 'Sign in after ingest to refresh live Confidence from your readings.',
    plainLanguage: '',
    signals: [
      { name: 'Customer usage outliers', level: 'Thin' as ConfidenceLevel | '—', mode: 'Watch' },
      { name: 'Water balance', level: 'Thin' as ConfidenceLevel | '—', mode: 'Watch' },
      { name: 'Stuck / diagnostic meters', level: '—' as const, mode: 'Actionable' },
    ],
  });

  liveAlerts = signal<LiveAlert[]>([]);
  loadError = signal('');

  readonly balance = {
    periodLabel: 'July 2026 (demo)',
    producedGal: 1_240_000,
    billedGal: 1_136_000,
    unaccountedGal: 104_000,
    unaccountedPct: 8.4,
    status: 'loss' as 'loss' | 'gain' | 'ok',
  };

  readonly balanceChartData = {
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Produced (in)',
        data: [1.18, 1.21, 1.19, 1.25, 1.24],
        borderColor: '#1a6b73',
        backgroundColor: 'rgba(26, 107, 115, 0.12)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Billed (out)',
        data: [1.09, 1.12, 1.08, 1.14, 1.136],
        borderColor: '#c45c26',
        backgroundColor: 'transparent',
        tension: 0.35,
        fill: false,
      },
    ],
  };

  readonly balanceChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const y = ctx.parsed.y;
            if (y == null) return '';
            return `${ctx.dataset.label ?? ''}: ${(y * 1_000_000).toLocaleString()} gal`;
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: 'Million gallons' },
        beginAtZero: false,
      },
    },
  };

  ngOnInit(): void {
    void this.refreshLive();
  }

  async refreshLive(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.loadError.set('');
      return;
    }
    try {
      const res = await fetch(`${environment.apiBaseUrl}/alerts`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.loadError.set(body.error ?? `Alerts failed (${res.status})`);
        return;
      }
      this.loadError.set('');
      const level = (body.confidence?.level ?? 'Thin') as ConfidenceLevel;
      const months = Number(body.confidence?.monthsOfHistory ?? 0);
      const meterCount = Number(body.confidence?.meterCount ?? 0);
      const alerts = (body.alerts ?? []) as LiveAlert[];
      const watch = alerts.filter((a) => a.mode === 'Watch').length;
      const actionable = alerts.filter((a) => a.mode === 'Actionable').length;
      const displayScore =
        level === 'Thin' ? 28 : level === 'Building' ? 55 : level === 'Solid' ? 82 : 94;

      this.confidence.set({
        level,
        displayScore,
        monthsComparable: months,
        coveragePct: meterCount ? Math.min(100, Math.round((meterCount / Math.max(meterCount, 1)) * 100)) : 0,
        seasonality: months < 6 ? 'Incomplete (need more seasons)' : 'Broader seasonal coverage',
        meaning:
          'Confidence measures how much comparable history and meter coverage we have — not how sure we are of a leak.',
        guidance: body.confidence?.plainLanguage ?? '',
        plainLanguage: body.confidence?.plainLanguage ?? '',
        signals: [
          {
            name: 'Customer usage outliers',
            level,
            mode: body.confidence?.statisticalMode ?? 'Watch',
          },
          { name: 'Water balance', level: 'Thin', mode: 'Watch' },
          { name: 'Stuck / diagnostic meters', level: '—', mode: 'Actionable' },
        ],
      });

      this.kpis.set([
        { label: 'Meters monitored', value: String(meterCount || '—'), hint: 'From ingest store' },
        {
          label: 'Open alerts',
          value: String(alerts.length),
          hint: `${watch} Watch · ${actionable} Actionable`,
        },
        { label: 'Water balance', value: '8.4%', hint: 'Unaccounted (demo)' },
        { label: 'Data Confidence', value: level, hint: `${months} mo history` },
      ]);
      this.liveAlerts.set(alerts.slice(0, 5));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Network error');
    }
  }

  confidenceSeverity(level: ConfidenceLevel): 'secondary' | 'info' | 'success' | 'warn' {
    switch (level) {
      case 'Thin':
        return 'secondary';
      case 'Building':
        return 'warn';
      case 'Solid':
        return 'info';
      case 'Strong':
        return 'success';
    }
  }
}
