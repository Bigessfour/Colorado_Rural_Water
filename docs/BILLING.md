# Water Saver — Membership billing notes

*Living notes for Epic I. Product authority: [SPEC.md](SPEC.md) §9. Isolation: [TENANT_ISOLATION.md](TENANT_ISOLATION.md).*

This document covers **CRWA membership dues** for the Water Saver product (pilot status, plans, invoices, payment status). It does **not** cover municipal customer billing / CIS write-back (Spec §0 vNext).

---

## Principles

1. **Processor-agnostic core.** Admin can run pilot/paid tracking with offline payments only.
2. **Discover before install.** Do not ship a vendor SDK until Spec §12 / I3 is closed.
3. **Hybrid payments always.** Card *and* invoice/ACH/check (offline “Record external payment” never goes away).
4. **No secrets or raw cards in the frontend.** AWS Secrets Manager / SSM only.
5. **Clear status.** `pilot` | `active` | `past_due` | `suspended` always visible to CRWA Admin.

---

## Early pilot (no processor) — I0–I2

### Tenant fields (product contract)

| Field | Purpose |
| ----- | ------- |
| `billingStatus` | `pilot` \| `active` \| `past_due` \| `suspended` |
| `billingMode` | `pilot` \| `manual` \| `processor` (after install) |
| `planCode` | Suggested band / plan id (e.g. `meters_101_300`) |
| `meterCountEstimate` | For band suggestion only |
| `retentionMonths` | Ties to Spec retention / add-on pricing |
| `billingContactEmail` | Who receives invoices / pay links later |
| `pilotExpiresAt` | Optional pilot end |
| `lastPaymentAt` | Last successful payment or manual record |
| `billingNotes` | Internal CRWA notes (not board-facing) |
| `paymentProvider` | `none` \| `stripe` \| `square` \| `manual` \| `other` — after I4 |
| `paymentCustomerId` | External customer id (vendor-neutral) |
| `paymentSubscriptionId` | Optional |
| `paymentLatestInvoiceId` | Optional |

Prefer neutral names (`paymentCustomerId`) over `stripeCustomerId` as the only field.

### Ledger (I1)

Dynamo under `pk=TENANT#{tenantId}`, `sk=BILL#EVENT#{iso}#{id}`:

| Field | Notes |
| ----- | ----- |
| `source` | `admin_manual` \| `processor_webhook` \| `processor_sync` |
| `eventType` | `provision` \| `record_payment` \| `extend_pilot` \| `mark_past_due` \| `suspend` \| `reactivate` |
| `amountCents` / `currency` | USD default |
| `method` | `check` \| `ach` \| `card` \| `other` |
| `actorUserId` / `actorEmail` | Who recorded |
| `note` | Free text |
| `externalEventId` | Idempotency when processor exists |

### CRWA Admin flows

1. **Provision** — name, slug, meter estimate, contact, plan suggestion, **Pilot vs Paid**.
2. **Pilot** — `billingStatus: pilot`; optional expiry; no fake invoice required.
3. **Paid (manual)** — offline invoice (email/PDF/QuickBooks); **Record external payment** → `active`.
4. **Past due / Suspend / Reactivate** — always available; suspend policy (soft vs hard block) is Spec §12 open item (default soft warning until decided).

### Municipality view (I2)

System Admin: status, plain-language plan summary, ledger history. No “update card” until processor + portal (I6).

---

## Due-out: payment processor discovery (I3)

### Checklist for CRWA conversation

1. How does CRWA collect money from members today?
2. Existing processor or account? (name, who owns it, API/webhook access)
3. Preference: cards, ACH, check, emailed invoices?
4. Who books revenue (QuickBooks / accountant / other)?
5. Willing to open a dedicated SaaS processor account for Water Saver if needed?

### Decision outcomes

| Outcome | Next step |
| ------- | --------- |
| **A. Manual / offline only** | Stay on I0–I2; revisit before larger scale |
| **B. Reuse existing processor** | Spike adapter; document API/webhook vs CSV vs manual gaps |
| **C. Greenfield SaaS** | **Recommend Stripe Billing**; implement I4 Stripe path |
| **D. Other chosen vendor** | Same adapter pattern; no vendor-specific core |

**Write the outcome** into Spec §12 (check off discovery) and a short “Decision” subsection below when known.

### Decision log

| Date | Outcome | Notes |
| ---- | ------- | ----- |
| — | *Pending I3* | |

---

## Adapter boundary (I4+)

```text
Admin / municipality UI
        ↓
Billing status + ledger (Dynamo)
        ↓
PaymentProviderPort (interface)
        ├── ManualProvider (always)
        ├── StripeProvider (if chosen)
        └── FutureProvider
```

Core handlers must not import a vendor SDK outside the adapter package.

---

## Appendix: if Stripe is chosen (recommendation only)

Not mandatory. Use only after I3 outcome **C** (or equivalent).

### Why Stripe for greenfield SaaS

- Subscriptions, hosted invoices, Customer Portal, webhooks, strong docs
- Fits Terraform/Lambda integration
- Still supports invoice + offline mark-paid hybrid

### Objects

| Object | Use |
| ------ | --- |
| Customer | One per municipality; `metadata.tenant_id` |
| Product / Price | Plan bands + add-ons (Dashboard or API) |
| Invoice | Early path: hosted invoice URL |
| Checkout Session | Optional card-friendly pay link |
| Subscription | After pilot hardens (I7) |
| Customer Portal | Self-serve payment method / invoice history (I6) |

### Webhooks (minimum)

| Event | Tenant effect |
| ----- | ------------- |
| `invoice.paid` | → `active`; set `lastPaymentAt` |
| `invoice.payment_failed` | → `past_due` |
| `customer.subscription.updated` | Sync plan / cancel_at |
| `customer.subscription.deleted` | → `suspended` or canceled (policy) |
| `checkout.session.completed` | If Checkout used |

Handler: API Gateway (raw body) → verify signature → Lambda → Dynamo + ledger. Idempotent on Stripe event id.

### Secrets

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in Secrets Manager / SSM
- Prefer hosted Invoice/Checkout URLs over embedding card UI in the SPA for MVP

### Manual payment with Stripe

Admin “Record external payment” may mark the Stripe invoice paid out-of-band when an invoice exists, and always writes an internal ledger event.

---

## Pricing bands (suggestion defaults)

CRWA sets dollars. System may suggest:

| Band code (example) | Meter estimate |
| ------------------- | -------------- |
| `meters_0_100` | ≤100 |
| `meters_101_300` | 101–300 |
| `meters_301_750` | 301–750 |
| `meters_750_plus` | 750+ |

Add-ons (examples): retention beyond default, extra seats, support tier. Line items must stay board-readable.

---

## Related tickets

| ID | Summary |
| -- | ------- |
| I0 | Fields + provision pilot/paid |
| I1 | Manual payments + suspend actions |
| I2 | Municipality Billing page |
| I3 | Processor discovery (this doc) |
| I4–I8 | Install, webhooks, portal, dunning, export |
