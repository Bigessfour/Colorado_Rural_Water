import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

type ConfidenceLevel = 'Thin' | 'Building' | 'Solid' | 'Strong';

interface PilotRow {
  system: string;
  meters: string;
  unaccountedPct: string;
  confidence: ConfidenceLevel;
  monthsHistory: number;
  note: string;
}

@Component({
  selector: 'app-crwa-rollup-page',
  standalone: true,
  imports: [CardModule, TagModule, TableModule],
  templateUrl: './crwa-rollup-page.component.html',
  styleUrl: './crwa-rollup-page.component.scss',
})
export class CrwaRollupPageComponent {
  /** Sanitized demo rows — no customer PII. Spec §7b / tickets D4, G6, H5. */
  readonly pilots: PilotRow[] = [
    {
      system: 'Pilot A (demo)',
      meters: '~180',
      unaccountedPct: '8.4%',
      confidence: 'Thin',
      monthsHistory: 2,
      note: 'Watch statistical flags; coach for more history',
    },
    {
      system: 'Pilot B (demo)',
      meters: '~420',
      unaccountedPct: '4.1%',
      confidence: 'Solid',
      monthsHistory: 14,
      note: 'Actionable comparative alerts OK',
    },
    {
      system: 'Pilot C (demo)',
      meters: '~95',
      unaccountedPct: '11.2%',
      confidence: 'Building',
      monthsHistory: 5,
      note: '~1 more season toward Solid',
    },
  ];

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
