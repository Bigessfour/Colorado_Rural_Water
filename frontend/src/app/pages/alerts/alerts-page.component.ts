import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

interface AlertRow {
  id: string;
  mode: 'Watch' | 'Actionable';
  meterId: string;
  summary: string;
  status: string;
  confidenceNote: string;
}

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule, TableModule],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss',
})
export class AlertsPageComponent {
  /** Demo: thin history → Watch for statistical; Actionable for stuck. Spec §7b / H6. */
  alerts: AlertRow[] = [
    {
      id: 'demo-alert-1',
      mode: 'Watch',
      meterId: 'M-1042',
      summary: 'Usage ~3× peers this cycle — possible leak or irrigation change',
      status: 'open',
      confidenceNote: 'Thin history (~2 mo) — Watch only',
    },
    {
      id: 'demo-alert-2',
      mode: 'Actionable',
      meterId: 'M-1045',
      summary: 'Non-registering / stuck reading (0 across cycles)',
      status: 'open',
      confidenceNote: 'Deterministic meter signal',
    },
  ];

  acknowledge(alert: AlertRow): void {
    alert.status = 'acknowledged';
  }
}
