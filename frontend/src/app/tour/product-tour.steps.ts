/** Brief product tour — highlight key areas for new operators. */

export interface ProductTourStep {
  id: string;
  /** Matches [data-tour="…"] on the page. */
  anchor: string;
  route: string;
  title: string;
  body: string;
  /** Used when operator taps “Would you like to know more?” */
  featureKey: string;
  featureLabel: string;
}

export const PRODUCT_TOUR_VERSION = 'v1';

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: 'kpis',
    anchor: 'dashboard-kpis',
    route: '/dashboard',
    title: 'Your at-a-glance numbers',
    body: 'These cards summarize meters, open alerts, and water balance for your system. Refresh after you upload new readings.',
    featureKey: 'dashboard-kpis',
    featureLabel: 'Dashboard summary cards',
  },
  {
    id: 'meter-health',
    anchor: 'meter-health',
    route: '/dashboard',
    title: 'Meter health',
    body: 'How many meters look fine vs need a look. “Worth a look” is a soft signal; “Needs a check” is stronger — not an automatic leak claim.',
    featureKey: 'meter-health',
    featureLabel: 'Meter health chart',
  },
  {
    id: 'confidence',
    anchor: 'data-confidence',
    route: '/dashboard',
    title: 'Data Confidence',
    body: 'Shows how much history you have for fair comparisons. Thin means early data — keep uploading months when you can.',
    featureKey: 'data-confidence',
    featureLabel: 'Data Confidence',
  },
  {
    id: 'upload',
    anchor: 'upload-flow',
    route: '/upload',
    title: 'Bring in meter readings',
    body: 'Load a CSV or Excel export, match columns, check a preview, then import. Imperfect column names are OK — that is what the mapper is for.',
    featureKey: 'upload',
    featureLabel: 'Upload and column mapper',
  },
  {
    id: 'alerts',
    anchor: 'alerts-list',
    route: '/alerts',
    title: 'Alerts',
    body: 'Prioritized items for your system. Acknowledge when you have looked; export when you need a field list.',
    featureKey: 'alerts',
    featureLabel: 'Alerts',
  },
  {
    id: 'assistant',
    anchor: 'assistant-chat',
    route: '/assistant',
    title: 'Assistant',
    body: 'Ask in plain language about this page, alerts, uploads, or reports. Answers stay inside your water system.',
    featureKey: 'assistant',
    featureLabel: 'Water Saver Assistant',
  },
];

export function deepenPrompt(step: ProductTourStep): string {
  return (
    `I want to know more about this feature: ${step.featureLabel} (${step.featureKey}). ` +
    `Please explain for my water system: What can be entered here? What does this do? ` +
    `How can I get a report or export? Stay on this topic until I change the subject.`
  );
}
