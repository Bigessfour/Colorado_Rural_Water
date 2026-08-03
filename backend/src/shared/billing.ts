/**
 * Membership billing (Epic I0–I2) — processor-agnostic.
 * No payment-processor SDK. See docs/BILLING.md + Spec §9.
 */

export type BillingStatus = 'pilot' | 'active' | 'past_due' | 'suspended';
export type BillingMode = 'pilot' | 'manual' | 'processor';
export type PaymentMethod = 'check' | 'ach' | 'card' | 'other';
export type BillingEventSource = 'admin_manual' | 'processor_webhook' | 'processor_sync';
export type BillingEventType =
  | 'record_payment'
  | 'extend_pilot'
  | 'mark_past_due'
  | 'suspend'
  | 'reactivate'
  | 'provision';

export type PlanCode =
  | 'meters_0_100'
  | 'meters_101_300'
  | 'meters_301_750'
  | 'meters_750_plus'
  | 'custom';

export const PLAN_CODES: PlanCode[] = [
  'meters_0_100',
  'meters_101_300',
  'meters_301_750',
  'meters_750_plus',
  'custom',
];

export const BILLING_STATUSES: BillingStatus[] = ['pilot', 'active', 'past_due', 'suspended'];
export const BILLING_MODES: BillingMode[] = ['pilot', 'manual', 'processor'];
export const PAYMENT_METHODS: PaymentMethod[] = ['check', 'ach', 'card', 'other'];

export interface BillingFields {
  billingStatus: BillingStatus;
  billingMode: BillingMode;
  planCode: PlanCode;
  meterCountEstimate?: number;
  retentionMonths?: number;
  billingContactEmail?: string;
  pilotExpiresAt?: string;
  lastPaymentAt?: string;
  billingNotes?: string;
  /** Always `none` until I4; kept for forward-compatible profile shape. */
  paymentProvider: 'none' | 'stripe' | 'square' | 'manual' | 'other';
}

export interface BillingEvent {
  tenantId: string;
  eventId: string;
  createdAt: string;
  eventType: BillingEventType;
  source: BillingEventSource;
  billingStatusAfter: BillingStatus;
  amountCents?: number;
  currency?: string;
  method?: PaymentMethod;
  actorUserId: string;
  actorEmail: string;
  note?: string;
  pilotExpiresAt?: string;
  externalEventId?: string;
}

const PLAN_LABELS: Record<PlanCode, string> = {
  meters_0_100: 'Up to 100 meters',
  meters_101_300: '101–300 meters',
  meters_301_750: '301–750 meters',
  meters_750_plus: '750+ meters',
  custom: 'Custom plan',
};

const STATUS_LABELS: Record<BillingStatus, string> = {
  pilot: 'Pilot (complimentary)',
  active: 'Active (paid / current)',
  past_due: 'Past due',
  suspended: 'Suspended',
};

export function suggestPlanCode(meterCountEstimate: number | undefined): PlanCode {
  if (meterCountEstimate === undefined || !Number.isFinite(meterCountEstimate) || meterCountEstimate < 0) {
    return 'meters_0_100';
  }
  if (meterCountEstimate <= 100) return 'meters_0_100';
  if (meterCountEstimate <= 300) return 'meters_101_300';
  if (meterCountEstimate <= 750) return 'meters_301_750';
  return 'meters_750_plus';
}

export function planLabel(planCode: PlanCode): string {
  return PLAN_LABELS[planCode] ?? planCode;
}

export function billingStatusLabel(status: BillingStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function isBillingStatus(raw: unknown): raw is BillingStatus {
  return typeof raw === 'string' && (BILLING_STATUSES as string[]).includes(raw);
}

export function isBillingMode(raw: unknown): raw is BillingMode {
  return typeof raw === 'string' && (BILLING_MODES as string[]).includes(raw);
}

export function isPlanCode(raw: unknown): raw is PlanCode {
  return typeof raw === 'string' && (PLAN_CODES as string[]).includes(raw);
}

export function isPaymentMethod(raw: unknown): raw is PaymentMethod {
  return typeof raw === 'string' && (PAYMENT_METHODS as string[]).includes(raw);
}

export function defaultBillingFields(input: {
  pilotOrPaid?: 'pilot' | 'paid';
  billingStatus?: BillingStatus;
  billingMode?: BillingMode;
  planCode?: PlanCode;
  meterCountEstimate?: number;
  retentionMonths?: number;
  billingContactEmail?: string;
  pilotExpiresAt?: string;
  billingNotes?: string;
}): BillingFields {
  const wantPilot =
    input.billingStatus === 'pilot' ||
    input.pilotOrPaid === 'pilot' ||
    (input.pilotOrPaid !== 'paid' && input.billingStatus === undefined);

  const meterCountEstimate =
    input.meterCountEstimate !== undefined && Number.isFinite(input.meterCountEstimate)
      ? Math.max(0, Math.floor(input.meterCountEstimate))
      : undefined;

  const planCode = input.planCode ?? suggestPlanCode(meterCountEstimate);

  if (wantPilot) {
    return {
      billingStatus: 'pilot',
      billingMode: 'pilot',
      planCode,
      meterCountEstimate,
      retentionMonths: input.retentionMonths,
      billingContactEmail: input.billingContactEmail,
      pilotExpiresAt: input.pilotExpiresAt,
      billingNotes: input.billingNotes,
      paymentProvider: 'none',
    };
  }

  return {
    billingStatus: input.billingStatus && input.billingStatus !== 'pilot' ? input.billingStatus : 'active',
    billingMode: input.billingMode === 'processor' ? 'processor' : 'manual',
    planCode,
    meterCountEstimate,
    retentionMonths: input.retentionMonths,
    billingContactEmail: input.billingContactEmail,
    pilotExpiresAt: undefined,
    billingNotes: input.billingNotes,
    paymentProvider: 'none',
  };
}

/** Public municipality view — omit internal CRWA notes. */
export function publicBillingView(fields: BillingFields) {
  return {
    billingStatus: fields.billingStatus,
    billingStatusLabel: billingStatusLabel(fields.billingStatus),
    billingMode: fields.billingMode,
    planCode: fields.planCode,
    planLabel: planLabel(fields.planCode),
    meterCountEstimate: fields.meterCountEstimate,
    retentionMonths: fields.retentionMonths,
    billingContactEmail: fields.billingContactEmail,
    pilotExpiresAt: fields.pilotExpiresAt,
    lastPaymentAt: fields.lastPaymentAt,
    paymentProvider: fields.paymentProvider,
  };
}

export function crwaBillingView(fields: BillingFields) {
  return {
    ...publicBillingView(fields),
    billingNotes: fields.billingNotes,
  };
}

export function billEventSk(createdAt: string, eventId: string): string {
  return `BILL#EVENT#${createdAt}#${eventId}`;
}
