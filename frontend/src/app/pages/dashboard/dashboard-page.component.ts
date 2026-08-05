import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import {
  balanceBarOptions,
  buildBalanceBarChart,
  buildConfidenceChart,
  buildHealthDonut,
  buildUsageTrendChart,
  computeHealthCounts,
  doughnutOptions,
  usageChartOptions,
  type ChartData,
  type ConfidenceLevel,
} from '../../shared/chart-builders';

interface LiveAlert {
  id: string;
  mode: 'Watch' | 'Actionable';
  kind: 'meter' | 'balance';
  meterId?: string;
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
  imports: [
    CardModule,
    TagModule,
    ChartModule,
    DecimalPipe,
    MessageModule,
    RouterLink,
    ButtonModule,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  busy = signal(false);

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
    guidance: 'Sign in after uploading readings to refresh live Confidence.',
    improveHint: '',
    plainLanguage: '',
    signals: [
      {
        name: 'Customer usage outliers',
        level: 'Thin' as ConfidenceLevel | '—',
        mode: 'Watch' as const,
      },
      { name: 'Water balance', level: 'Thin' as ConfidenceLevel | '—', mode: 'Watch' as const },
      { name: 'Stuck / diagnostic meters', level: '—' as const, mode: 'Actionable' as const },
    ],
  });

  liveAlerts = signal<LiveAlert[]>([]);
  loadError = signal('');
  meterCount = signal(0);

  balance = signal<BalanceView>({
    periodLabel: 'No period yet',
    producedGal: 0,
    billedGal: 0,
    unaccountedGal: 0,
    unaccountedPct: null,
    status: 'insufficient',
    live: false,
    hint: 'Upload customer meters and source readings, then refresh.',
  });

  usageChartData = signal<ChartData>({ labels: [], datasets: [] });
  usageHasBand = signal(false);
  usageEmpty = signal(true);

  balanceBarData = signal<ChartData>({ labels: [], datasets: [] });
  balanceInsufficient = signal(true);

  confidenceChartData = signal<ChartData>(buildConfidenceChart('Thin'));
  healthChartData = signal<ChartData>(buildHealthDonut({ normal: 0, watch: 0, actionable: 0 }));
  showHealth = signal(false);

  readonly usageChartOptions = usageChartOptions;
  readonly balanceBarOptions = balanceBarOptions;
  readonly doughnutOptions = doughnutOptions;

  ngOnInit(): void {
    void this.refreshLive();
  }

  balanceStatusSeverity(
    status: BalanceView['status'],
  ): 'secondary' | 'info' | 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'insufficient':
        return 'secondary';
      case 'ok':
        return 'success';
      case 'loss':
        return 'warn';
      case 'gain':
        return 'info';
    }
  }

  balanceStatusLabel(status: BalanceView['status']): string {
    switch (status) {
      case 'insufficient':
        return 'Need both sides';
      case 'ok':
        return 'Balanced';
      case 'loss':
        return 'Unaccounted loss';
      case 'gain':
        return 'Sold > pumped';
    }
  }

  async refreshLive(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.loadError.set('');
      return;
    }
    this.busy.set(true);
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
      const coveragePct = Number(alertsBody.confidence?.coveragePct ?? 0);
      const displayScore = Number(
        alertsBody.confidence?.displayScore ??
          (level === 'Thin' ? 28 : level === 'Building' ? 55 : level === 'Solid' ? 82 : 94),
      );
      this.meterCount.set(meterCount);

      const meterAlerts = (
        (alertsBody.alerts ?? []) as Array<{
          id: string;
          mode: 'Watch' | 'Actionable';
          meterId?: string;
          serviceAddress?: string;
          summary: string;
          confidenceNote: string;
        }>
      ).map((a): LiveAlert => ({
        id: a.id,
        mode: a.mode,
        kind: 'meter',
        meterId: a.meterId,
        serviceAddress: a.serviceAddress,
        summary: a.summary,
        confidenceNote: a.confidenceNote,
      }));
      const balanceAlerts = (
        (alertsBody.balanceAlerts ?? []) as Array<{
          id: string;
          mode: 'Watch' | 'Actionable';
          summary: string;
          confidenceNote: string;
          periodLabel?: string;
        }>
      ).map((a): LiveAlert => ({
        id: a.id,
        mode: a.mode ?? 'Watch',
        kind: 'balance',
        summary: a.summary,
        confidenceNote: a.confidenceNote,
        serviceAddress: a.periodLabel,
      }));
      const alerts = [...balanceAlerts, ...meterAlerts];
      const watch = alerts.filter((a) => a.mode === 'Watch').length;
      const actionable = alerts.filter((a) => a.mode === 'Actionable').length;

      const health = computeHealthCounts(meterCount, meterAlerts);
      this.healthChartData.set(buildHealthDonut(health));
      this.showHealth.set(meterCount > 0);
      this.confidenceChartData.set(buildConfidenceChart(level));

      let balanceHint = 'Upload customer + source readings for live In/Out.';
      let balanceKpi = '—';
      let balanceKpiHint = 'Unaccounted';
      let balanceStatus: BalanceView['status'] = 'insufficient';

      if (balanceRes.ok) {
        const bal = await balanceRes.json();
        const pct = bal.unaccountedPct;
        balanceStatus = (bal.status ?? 'insufficient') as BalanceView['status'];
        const periodLabel = bal.periodLabel ?? bal.period ?? '—';
        const producedGal = Number(bal.producedGal ?? 0);
        const billedGal = Number(bal.billedGal ?? 0);
        const unaccountedGal = Number(bal.unaccountedGal ?? 0);
        this.balance.set({
          periodLabel,
          producedGal,
          billedGal,
          unaccountedGal,
          unaccountedPct: pct == null ? null : Number(pct),
          status: balanceStatus,
          live: true,
          hint:
            balanceStatus === 'insufficient'
              ? 'Need source production and customer meter deltas in the same period — not a dig-now loss signal.'
              : 'Live from GET /balance — In − Out = unaccounted.',
        });
        balanceKpi = pct == null ? '—' : `${pct}%`;
        balanceKpiHint =
          balanceStatus === 'gain'
            ? 'Sold > pumped'
            : balanceStatus === 'loss'
              ? 'Unaccounted loss'
              : balanceStatus === 'ok'
                ? 'Balanced'
                : 'Insufficient data';
        balanceHint = periodLabel;

        const bar = buildBalanceBarChart({
          periodLabel,
          producedGal,
          billedGal,
          unaccountedGal,
          status: balanceStatus,
        });
        this.balanceBarData.set(bar.data);
        this.balanceInsufficient.set(bar.insufficient);

        const trend = (bal.trend ?? []) as Array<{
          periodLabel?: string;
          period?: string;
          producedGal?: number;
          billedGal?: number;
          unaccountedGal?: number;
          status?: string;
        }>;
        const usage = buildUsageTrendChart(trend);
        this.usageChartData.set(usage.data);
        this.usageHasBand.set(usage.hasBand);
        this.usageEmpty.set(usage.empty);
      } else {
        const balErr = await balanceRes.json().catch(() => ({}));
        balanceHint = balErr.error ?? `Balance unavailable (${balanceRes.status})`;
        this.usageEmpty.set(true);
        this.balanceInsufficient.set(true);
      }

      const balanceSignalLevel: ConfidenceLevel | '—' =
        balanceStatus === 'insufficient' ? 'Thin' : level;

      this.confidence.set({
        level,
        displayScore,
        monthsComparable: months,
        coveragePct,
        seasonality: months < 6 ? 'Incomplete (need more seasons)' : 'Broader seasonal coverage',
        meaning:
          'Confidence measures how much comparable history and meter coverage we have — not how sure we are of a leak.',
        guidance: alertsBody.confidence?.plainLanguage ?? '',
        improveHint: alertsBody.confidence?.improveHint ?? '',
        plainLanguage: alertsBody.confidence?.plainLanguage ?? '',
        signals: [
          {
            name: 'Customer usage outliers',
            level,
            mode: alertsBody.confidence?.statisticalMode ?? 'Watch',
          },
          {
            name: 'Water balance',
            level: balanceSignalLevel,
            mode: 'Watch',
          },
          { name: 'Stuck / diagnostic meters', level: '—', mode: 'Actionable' },
        ],
      });

      this.kpis.set([
        { label: 'Meters monitored', value: String(meterCount || '—'), hint: 'From your meter list' },
        {
          label: 'Open alerts',
          value: String(alerts.length),
          hint: `${watch} Watch · ${actionable} Actionable`,
        },
        { label: 'Water balance', value: balanceKpi, hint: balanceKpiHint || balanceHint },
        {
          label: 'Data Confidence',
          value: level,
          hint: `${months} mo · ${coveragePct}% coverage`,
        },
      ]);
      this.liveAlerts.set(alerts.slice(0, 8));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
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
