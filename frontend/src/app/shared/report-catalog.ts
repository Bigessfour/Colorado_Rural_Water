/** Catalog of report processes shown on the Reports page (Feature 012 + legacy C4). */

export type ReportAction =
  'work-order-csv' | 'work-order-xlsx' | 'summary-html' | 'alerts-flagged-csv';

export interface ReportProcessDef {
  id: string;
  name: string;
  description: string;
  formats: string[];
  category: 'field' | 'operations' | 'legacy';
  apiPath: string;
  action: ReportAction;
  requiresAuth: boolean;
}

export const REPORT_CATALOG: ReportProcessDef[] = [
  {
    id: 'work-order-csv',
    name: 'Flagged meters work order',
    description:
      'Clerk trouble-ticket export: meter, address, alert, Confidence note, coords, map link, recommended field action.',
    formats: ['CSV'],
    category: 'field',
    apiPath: '/reports/work-orders?format=csv',
    action: 'work-order-csv',
    requiresAuth: true,
  },
  {
    id: 'work-order-xlsx',
    name: 'Flagged meters work order (Excel)',
    description: 'Same work-order columns formatted for Excel / shared with field crews.',
    formats: ['XLSX'],
    category: 'field',
    apiPath: '/reports/work-orders?format=xlsx',
    action: 'work-order-xlsx',
    requiresAuth: true,
  },
  {
    id: 'ops-summary',
    name: 'Monthly operations summary',
    description:
      'Printable KPI snapshot: Confidence, water balance In/Out, open alerts. Opens HTML in a new tab — use Browser Print → Save as PDF (no separate PDF file).',
    formats: ['HTML', 'Print → PDF'],
    category: 'operations',
    apiPath: '/reports/summary?format=html',
    action: 'summary-html',
    requiresAuth: true,
  },
  {
    id: 'alerts-csv',
    name: 'Flagged meters CSV (alerts feed)',
    description: 'Legacy C4 export from Alerts — flagged meters only with Confidence notes.',
    formats: ['CSV'],
    category: 'legacy',
    apiPath: '/alerts?format=csv',
    action: 'alerts-flagged-csv',
    requiresAuth: true,
  },
];

export function categoryLabel(category: ReportProcessDef['category']): string {
  switch (category) {
    case 'field':
      return 'Field / work orders';
    case 'operations':
      return 'Operations';
    case 'legacy':
      return 'Legacy export';
    default:
      return category;
  }
}
