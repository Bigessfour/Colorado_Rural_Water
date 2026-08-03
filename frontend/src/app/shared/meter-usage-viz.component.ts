import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { sparklineOptions } from './chart-builders';
import {
  buildMeterSparklineFromReadings,
  buildYearOverYearChart,
  computeMeterUsageStats,
  yearOverYearChartOptions,
  type MeterReadingPoint,
} from './meter-usage-stats';

/**
 * Reusable per-meter usage picture: age / cycle / YTD / lifetime + sparkline + YoY.
 * PrimeNG Chart + Message (MCP-aligned standalone imports).
 */
@Component({
  selector: 'app-meter-usage-viz',
  imports: [ChartModule, MessageModule, DecimalPipe],
  templateUrl: './meter-usage-viz.component.html',
  styleUrl: './meter-usage-viz.component.scss',
})
export class MeterUsageVizComponent {
  /** Optional display id for a11y labels. */
  readonly meterId = input<string>('');
  readonly installDate = input<string | null>(null);
  readonly readings = input<MeterReadingPoint[]>([]);

  readonly stats = computed(() =>
    computeMeterUsageStats(this.readings(), this.installDate()),
  );

  readonly sparkline = computed(() => buildMeterSparklineFromReadings(this.readings()));

  readonly yoy = computed(() => buildYearOverYearChart(this.readings()));

  readonly sparklineOptions = sparklineOptions;
  readonly yoyOptions = yearOverYearChartOptions;
}
