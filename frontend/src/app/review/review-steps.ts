/** F5 — guided Kelly review steps (keep in sync with backend REVIEW_STEP_IDS). */

export type ReviewRating = 'love' | 'dont_need' | 'change' | 'need_new';

export interface ReviewStepDef {
  id: string;
  title: string;
  lookAt: string;
  route: string;
}

export const REVIEW_STEPS: ReviewStepDef[] = [
  {
    id: 'signin',
    title: 'Sign-in / first impression',
    lookAt: 'Calm login, brand, and how easy it feels to get in.',
    route: '/login',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    lookAt: 'KPIs, In/Out/Loss trend, Data Confidence card, and the alert feed.',
    route: '/dashboard',
  },
  {
    id: 'upload_mapper',
    title: 'Upload + column mapper',
    lookAt:
      'Try a practice export (sample CSV or Town of Steve Excel). How clear is the column mapper?',
    route: '/upload',
  },
  {
    id: 'alerts',
    title: 'Alerts',
    lookAt: 'Watch vs Actionable wording. Would an operator know what to do next?',
    route: '/alerts',
  },
  {
    id: 'sources_balance',
    title: 'Sources + water balance',
    lookAt: 'Named wells/sources and how balance shows up (Sources page + Dashboard).',
    route: '/sources',
  },
  {
    id: 'meter_inventory',
    title: 'Meter inventory',
    lookAt: 'List, add, and asset fields (manufacturer, serial, etc.).',
    route: '/meters',
  },
  {
    id: 'ack_history_export',
    title: 'Acknowledge / history / export',
    lookAt: 'Acknowledge an alert, open History, and Export flagged CSV if useful.',
    route: '/alerts',
  },
  {
    id: 'crwa_admin',
    title: 'CRWA Admin',
    lookAt: 'Provision, roll-up (CRWA nav), and billing status — the association view.',
    route: '/crwa',
  },
  {
    id: 'overall',
    title: 'Overall / missing features',
    lookAt: 'Anything missing, confusing, or worth building next? Use Need something new.',
    // Stay on dashboard — do not send Kelly back to /review (howto Start) mid-finish.
    route: '/dashboard',
  },
];

export const RATING_OPTIONS: { value: ReviewRating; label: string }[] = [
  { value: 'love', label: 'Love this' },
  { value: 'dont_need', label: "Don't need this" },
  { value: 'change', label: 'Change this' },
  { value: 'need_new', label: 'Need something new' },
];
