import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';

/** Demo Confidence stub — wires to H3/H4; not a leak-accuracy %. */
export type ConfidenceLevel = 'Thin' | 'Building' | 'Solid' | 'Strong';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CardModule, TagModule, ChartModule, DecimalPipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  readonly kpis = [
    { label: 'Meters monitored', value: '—', hint: 'After first upload' },
    { label: 'Open alerts', value: '2', hint: '1 Watch · 1 Actionable (demo)' },
    { label: 'Water balance', value: '8.4%', hint: 'Unaccounted (demo)' },
    { label: 'Meter health', value: '—', hint: 'Stuck / non-registering' },
  ];

  /**
   * Demo: thin history (≈2 months). Score = history/coverage heuristic,
   * not “probability of a leak.” Spec §7b / ticket H4.
   */
  readonly confidence = {
    level: 'Thin' as ConfidenceLevel,
    displayScore: 28,
    monthsComparable: 2,
    coveragePct: 62,
    seasonality: 'Incomplete (no winter cycle yet)',
    meaning:
      'Confidence measures how much comparable history and meter coverage we have — not how sure we are of a leak.',
    guidance:
      'About 4 more similar monthly cycles to reach Solid (proposed >90% display default). Statistical high-usage flags stay Watch until then.',
    signals: [
      { name: 'Customer usage outliers', level: 'Thin' as ConfidenceLevel, mode: 'Watch' },
      { name: 'Water balance', level: 'Thin' as ConfidenceLevel, mode: 'Watch' },
      { name: 'Stuck / diagnostic meters', level: '—', mode: 'Actionable' },
    ],
  };

  /** Demo stub — wires to G3/G5 once source + customer readings exist. */
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
