import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';

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
    { label: 'Open alerts', value: '2', hint: 'Demo stub' },
    { label: 'Water balance', value: '8.4%', hint: 'Unaccounted (demo)' },
    { label: 'Meter health', value: '—', hint: 'Stuck / non-registering' },
  ];

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
}
