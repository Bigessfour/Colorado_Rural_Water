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

interface BalanceView {
  periodLabel: string;
  producedGal: number;
  billedGal: number;
  unaccountedGal: number;
  unaccountedPct: number | null;
  status: 'loss' | 'gain' | 'ok' | 'insufficient';
  live: boolean;
  hint: string;
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
    { label: 'Water balance', value: '—', hint: 'Unaccounted (live)' },
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

  balance = signal<BalanceView>({
    periodLabel: 'No period yet',
    producedGal: 0,
    billedGal: 0,
    unaccountedGal: 0,
    unaccountedPct: null,
    status: 'insufficient',
    live: false,
    hint: 'Ingest customer meters and source readings, then refresh.',
  });

  balanceChartData = signal({
    labels: [] as string[],
    datasets: [
      {
        label: 'Produced (in)',
        data: [] as number[],
        borderColor: '#1a6b73',
        backgroundColor: 'rgba(26, 107, 115, 0.12)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Billed (out)',
        data: [] as number[],
        borderColor: '#c45c26',
        backgroundColor: 'transparent',
        tension: 0.35,
        fill: false,
      },
    ],
  });

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
      const [alertsRes, balanceRes] = await Promise.all([
        fetch(`${environment.apiBaseUrl}/alerts`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        fetch(`${environment.apiBaseUrl}/balance`, {
          headers: { authorization: `Bearer ${token}` },
        }),
      ]);

      const alertsBody = await alertsRes.json();
      if (!alertsRes.ok) {
        this.loadError.set(alertsBody.error ?? `Alerts failed (${alertsRes.status})`);
        return;
      }
      this.loadError.set('');
      const level = (alertsBody.confidence?.level ?? 'Thin') as ConfidenceLevel;
      const months = Number(alertsBody.confidence?.monthsOfHistory ?? 0);
      const meterCount = Number(alertsBody.confidence?.meterCount ?? 0);
      const alerts = (alertsBody.alerts ?? []) as LiveAlert[];
      const watch = alerts.filter((a) => a.mode === 'Watch').length;
      const actionable = alerts.filter((a) => a.mode === 'Actionable').length;
      const displayScore =
        level === 'Thin' ? 28 : level === 'Building' ? 55 : level === 'Solid' ? 82 : 94;

      let balanceHint = 'Ingest customer + source readings for live In/Out.';
      let balanceKpi = '—';
      let balanceKpiHint = 'Unaccounted';

      if (balanceRes.ok) {
        const bal = await balanceRes.json();
        const pct = bal.unaccountedPct;
        const status = (bal.status ?? 'insufficient') as BalanceView['status'];
        this.balance.set({
          periodLabel: bal.periodLabel ?? bal.period ?? '—',
          producedGal: Number(bal.producedGal ?? 0),
          billedGal: Number(bal.billedGal ?? 0),
          unaccountedGal: Number(bal.unaccountedGal ?? 0),
          unaccountedPct: pct == null ? null : Number(pct),
          status,
          live: true,
          hint:
            status === 'insufficient'
              ? 'Need source production and customer meter deltas in the same period.'
              : 'Live from GET /balance — In − Out = unaccounted.',
        });
        balanceKpi = pct == null ? '—' : `${pct}%`;
        balanceKpiHint =
          status === 'gain' ? 'Sold > pumped' : status === 'loss' ? 'Unaccounted loss' : 'Balanced';
        balanceHint = bal.periodLabel ?? '';

        const trend = (bal.trend ?? []) as Array<{
          periodLabel?: string;
          period?: string;
          producedGal?: number;
          billedGal?: number;
        }>;
        if (trend.length) {
          this.balanceChartData.set({
            labels: trend.map((t) => shortPeriod(t.periodLabel ?? t.period ?? '')),
            datasets: [
              {
                label: 'Produced (in)',
                data: trend.map((t) => Number(t.producedGal ?? 0) / 1_000_000),
                borderColor: '#1a6b73',
                backgroundColor: 'rgba(26, 107, 115, 0.12)',
                tension: 0.35,
                fill: true,
              },
              {
                label: 'Billed (out)',
                data: trend.map((t) => Number(t.billedGal ?? 0) / 1_000_000),
                borderColor: '#c45c26',
                backgroundColor: 'transparent',
                tension: 0.35,
                fill: false,
              },
            ],
          });
        }
      } else {
        const balErr = await balanceRes.json().catch(() => ({}));
        balanceHint = balErr.error ?? `Balance unavailable (${balanceRes.status})`;
      }

      this.confidence.set({
        level,
        displayScore,
        monthsComparable: months,
        coveragePct: meterCount ? Math.min(100, Math.round((meterCount / Math.max(meterCount, 1)) * 100)) : 0,
        seasonality: months < 6 ? 'Incomplete (need more seasons)' : 'Broader seasonal coverage',
        meaning:
          'Confidence measures how much comparable history and meter coverage we have — not how sure we are of a leak.',
        guidance: alertsBody.confidence?.plainLanguage ?? '',
        plainLanguage: alertsBody.confidence?.plainLanguage ?? '',
        signals: [
          {
            name: 'Customer usage outliers',
            level,
            mode: alertsBody.confidence?.statisticalMode ?? 'Watch',
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
        { label: 'Water balance', value: balanceKpi, hint: balanceKpiHint || balanceHint },
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

function shortPeriod(label: string): string {
  const m = label.match(/^([A-Za-z]{3})/);
  if (m) return m[1];
  const ym = label.match(/^\d{4}-(\d{2})$/);
  if (ym) {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[Number(ym[1]) - 1] ?? label;
  }
  return label.slice(0, 3) || label;
}
