import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

interface AlertRow {
  id: string;
  priority: 'high' | 'medium' | 'low';
  meterId: string;
  summary: string;
  status: string;
}

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule, TableModule],
  templateUrl: './alerts-page.component.html',
  styleUrl: './alerts-page.component.scss',
})
export class AlertsPageComponent {
  alerts: AlertRow[] = [
    {
      id: 'demo-alert-1',
      priority: 'high',
      meterId: 'M-1042',
      summary: 'Usage ~3× typical — possible leak or irrigation change',
      status: 'open',
    },
    {
      id: 'demo-alert-2',
      priority: 'medium',
      meterId: 'M-1045',
      summary: 'Non-registering / stuck reading (0 across cycles)',
      status: 'open',
    },
  ];

  acknowledge(alert: AlertRow): void {
    alert.status = 'acknowledged';
  }
}
