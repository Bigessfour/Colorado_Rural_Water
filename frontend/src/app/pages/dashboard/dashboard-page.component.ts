/**
 * Operator home — Kelly demo centerpiece.
 * Loads GET /alerts + GET /balance + GET /meters with the Cognito Bearer token only
 * (no client tenant switch). Talk track: In/Out/Unaccounted, Data Confidence
 * (history depth, not leak %), Watch vs Actionable, calm Meter Health.
 */

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
  type BalanceTrendPoint,
  type ChartData,
  type ConfidenceLevel,
} from '../../shared/chart-builders';
import {
  DEFAULT_METER_AGE_YEARS,
  buildMeterHealthSummary,
  buildSourceProductionChart,
  buildUnaccountedSparkline,
  formatLastIngestLine,
  isThinConfidence,
  pickTopOutliers,
  softBalanceKpiHint,
  softBalanceStatusLabel,
  sourceBarOptions,
  unaccountedSparkOptions,
  type LastIngestView,
  type MeterHealthSummary,
  type OutlierRow,
} from '../../shared/dashboard-summary';
import { parseIntakeSummary } from '../../shared/intake-summary';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';

interface LiveAlert {
  id: string;
  type?: string;
  mode: 'Watch' | 'Actionable';
  kind: 'meter' | 'balance';
  meterId?: string;
  serviceAddress?: string;
  summary: string;
  confidenceNote: string;
  usageGal?: number;
  usageRatio?: number;
  diagnosticFlags?: string[];
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
    FormsModule,
    SelectButton,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  /** Install-age threshold for Meter Health (years). */
  readonly meterAgeYears = DEFAULT_METER_AGE_YEARS;

  busy = signal(false);

  /**
   * Usage chart compare mode. Default `current` keeps the screen clean;
   * `prior` overlays last year when 24 mo of trend is available.
   */
  usageCompareMode = signal<'current' | 'prior'>('current');
  readonly usageCompareOptions: { label: string; value: 'current' | 'prior' }[] = [
    { label: 'This period', value: 'current' },
    { label: 'vs prior year', value: 'prior' },
  ];
  /** Raw balance trend (up to 24 mo) for rebuild on toggle. */
  private usageTrendRaw: BalanceTrendPoint[] = [];
  priorYearAvailable = signal(false);
  priorYearSparse = signal(false);

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
  /** Incomplete intake → calm banner (Feature 012). */
  intakeNudge = signal('');
  /** Path A–D from intake next to Confidence. */
  intakePathNote = signal('');

  lastIngest = signal<LastIngestView | null>(null);
  meterHealth = signal<MeterHealthSummary>({
    stuckCount: 0,
    diagnosticCount: 0,
    olderCount: 0,
    olderThresholdYears: DEFAULT_METER_AGE_YEARS,
    withInstallDate: 0,
  });
  topOutliers = signal<OutlierRow[]>([]);

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

  sourceProdChartData = signal<ChartData>({ labels: [], datasets: [] });
  sourceProdEmpty = signal(true);

  unaccountedSparkData = signal<ChartData>({ labels: [], datasets: [] });
  unaccountedSparkEmpty = signal(true);
  unaccountedInsufficientOnly = signal(false);

  confidenceChartData = signal<ChartData>(buildConfidenceChart('Thin'));
  healthChartData = signal<ChartData>(buildHealthDonut({ normal: 0, watch: 0, actionable: 0 }));
  showHealth = signal(false);

  readonly usageChartOptions = usageChartOptions;
  readonly balanceBarOptions = balanceBarOptions;
  readonly doughnutOptions = doughnutOptions;
  readonly sourceBarOptions = sourceBarOptions;
  readonly unaccountedSparkOptions = unaccountedSparkOptions;

  ngOnInit(): void {
    void this.refreshLive();
  }

  balanceStatusSeverity(
    status: BalanceView['status'],
  ): 'secondary' | 'info' | 'success' | 'warn' | 'danger' {
    // Thin Confidence: keep loss/gain calm (secondary), same spirit as Watch on statistical flags.
    if (isThinConfidence(this.confidence().level) && status !== 'insufficient') {
      return 'secondary';
    }
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
    return softBalanceStatusLabel(status, this.confidence().level);
  }

  onUsageCompareChange(mode: 'current' | 'prior'): void {
    this.usageCompareMode.set(mode);
    this.applyUsageTrendChart();
  }

  private applyUsageTrendChart(): void {
    const usage = buildUsageTrendChart(this.usageTrendRaw, {
      comparePriorYear: this.usageCompareMode() === 'prior',
      windowMonths: 12,
    });
    this.usageChartData.set(usage.data);
    this.usageHasBand.set(usage.hasBand);
    this.usageEmpty.set(usage.empty);
    this.priorYearAvailable.set(usage.priorYearAvailable);
    this.priorYearSparse.set(usage.priorYearSparse);
  }

  /** Parallel live refresh — KPIs, confidence, balance, health, outliers, last ingest. */
  async refreshLive(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.loadError.set('');
      return;
    }
    this.busy.set(true);
    try {
      // Tenant isolation: Authorization Bearer only — API resolves tenant_id from JWT.
      const headers = { authorization: `Bearer ${token}` };
      const [alertsRes, balanceRes, onboardingRes, metersRes] = await Promise.all([
        fetch(`${environment.apiBaseUrl}/alerts`, { headers }),
        // 24 months so prior-year overlay can align calendar months when toggled.
        fetch(`${environment.apiBaseUrl}/balance?trendMonths=24`, { headers }),
        fetch(`${environment.apiBaseUrl}/onboarding`, { headers }),
        fetch(`${environment.apiBaseUrl}/meters`, { headers }),
      ]);

      try {
        if (onboardingRes.ok) {
          const onb = await onboardingRes.json();
          const summary = parseIntakeSummary(onb);
          if (summary && !summary.complete) {
            const stepNum = Math.min(summary.currentStep + 1, summary.stepCount);
            this.intakeNudge.set(
              `Finish member intake (step ${stepNum} of ${summary.stepCount}). `,
            );
          } else {
            this.intakeNudge.set('');
          }
          this.intakePathNote.set(
            summary?.pathLabel ? `From member intake: ${summary.pathLabel}.` : '',
          );
        } else {
          this.intakeNudge.set('');
          this.intakePathNote.set('');
        }
      } catch {
        this.intakeNudge.set('');
        this.intakePathNote.set('');
      }

      const alertsBody = await alertsRes.json();
      if (!alertsRes.ok) {
        this.loadError.set(alertsBody.error ?? `Alerts failed (${alertsRes.status})`);
        return;
      }
      this.loadError.set('');
      this.lastIngest.set(formatLastIngestLine(alertsBody.lastIngest));

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
          type?: string;
          mode: 'Watch' | 'Actionable';
          meterId?: string;
          serviceAddress?: string;
          summary: string;
          confidenceNote: string;
          usageGal?: number;
          usageRatio?: number;
          diagnosticFlags?: string[];
        }>
      ).map(
        (a): LiveAlert => ({
          id: a.id,
          type: a.type,
          mode: a.mode,
          kind: 'meter',
          meterId: a.meterId,
          serviceAddress: a.serviceAddress,
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          usageGal: a.usageGal,
          usageRatio: a.usageRatio,
          diagnosticFlags: a.diagnosticFlags,
        }),
      );
      const balanceAlerts = (
        (alertsBody.balanceAlerts ?? []) as Array<{
          id: string;
          mode: 'Watch' | 'Actionable';
          summary: string;
          confidenceNote: string;
          periodLabel?: string;
        }>
      ).map(
        (a): LiveAlert => ({
          id: a.id,
          mode: a.mode ?? 'Watch',
          kind: 'balance',
          summary: a.summary,
          confidenceNote: a.confidenceNote,
          serviceAddress: a.periodLabel,
        }),
      );
      const alerts = [...balanceAlerts, ...meterAlerts];
      const watch = alerts.filter((a) => a.mode === 'Watch').length;
      const actionable = alerts.filter((a) => a.mode === 'Actionable').length;

      const health = computeHealthCounts(meterCount, meterAlerts);
      this.healthChartData.set(buildHealthDonut(health));
      this.showHealth.set(meterCount > 0);
      this.confidenceChartData.set(buildConfidenceChart(level));
      this.topOutliers.set(pickTopOutliers(meterAlerts, level, 5));

      let metersList: Array<{ installDate?: string | null }> = [];
      if (metersRes.ok) {
        try {
          const metersBody = await metersRes.json();
          metersList = (metersBody.meters ?? []) as Array<{ installDate?: string | null }>;
        } catch {
          metersList = [];
        }
      }
      this.meterHealth.set(
        buildMeterHealthSummary({
          alerts: meterAlerts,
          meters: metersList,
          thresholdYears: this.meterAgeYears,
        }),
      );

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
        const thin = isThinConfidence(level);
        let liveHint =
          balanceStatus === 'insufficient'
            ? 'Need source production and customer meter deltas in the same period — not a dig-now loss signal.'
            : 'Live from GET /balance — In − Out = unaccounted.';
        if (thin && balanceStatus !== 'insufficient') {
          liveHint =
            'Early balance figure — Thin Confidence keeps this as Watch context, not dig-now.';
        }
        this.balance.set({
          periodLabel,
          producedGal,
          billedGal,
          unaccountedGal,
          unaccountedPct: pct == null ? null : Number(pct),
          status: balanceStatus,
          live: true,
          hint: liveHint,
        });
        // Thin: do not surface raw unaccounted % as a dig-now KPI claim.
        balanceKpi =
          thin || pct == null ? (thin && balanceStatus !== 'insufficient' ? 'Early' : '—') : `${pct}%`;
        balanceKpiHint = softBalanceKpiHint(balanceStatus, level);
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

        const trend = (bal.trend ?? []) as BalanceTrendPoint[];
        this.usageTrendRaw = trend;
        this.applyUsageTrendChart();

        const srcRows = (
          (bal.productionBySource ?? []) as Array<{
            sourceId: string;
            sourceName?: string | null;
            gallons: number;
          }>
        ).map((r) => ({
          sourceId: r.sourceId,
          sourceName: r.sourceName,
          gallons: Number(r.gallons ?? 0),
        }));
        const srcChart = buildSourceProductionChart(srcRows);
        this.sourceProdChartData.set(srcChart.data);
        this.sourceProdEmpty.set(srcChart.empty);

        // Thin Confidence: suppress unaccounted % trend claims (Watch-level caution).
        if (thin) {
          this.unaccountedSparkData.set({ labels: [], datasets: [] });
          this.unaccountedSparkEmpty.set(true);
          this.unaccountedInsufficientOnly.set(false);
        } else {
          const spark = buildUnaccountedSparkline(trend, 12);
          this.unaccountedSparkData.set(spark.data);
          this.unaccountedSparkEmpty.set(spark.empty);
          this.unaccountedInsufficientOnly.set(spark.insufficientOnly);
        }
      } else {
        const balErr = await balanceRes.json().catch(() => ({}));
        balanceHint = balErr.error ?? `Balance unavailable (${balanceRes.status})`;
        this.usageEmpty.set(true);
        this.balanceInsufficient.set(true);
        this.sourceProdEmpty.set(true);
        this.unaccountedSparkEmpty.set(true);
        this.usageTrendRaw = [];
        this.priorYearAvailable.set(false);
        this.priorYearSparse.set(false);
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
        {
          label: 'Meters monitored',
          value: String(meterCount || '—'),
          hint: 'From your meter list',
        },
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

  /** Template helper — Thin Confidence softens outlier / loss claims. */
  isThin(): boolean {
    return isThinConfidence(this.confidence().level);
  }
}
