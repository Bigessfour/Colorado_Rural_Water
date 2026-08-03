# Tenant isolation strategy (MVP)

Ticket **A4** living notes. Isolation is non-negotiable for Kelly Stone trust demos.

## Principle

Every persisted record and every authorized request is scoped by `tenant_id`. Client-supplied tenant IDs are never trusted for authorization.

## Identity

| Claim / group      | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `custom:tenant_id` | Municipality this user belongs to (null only for CRWA admins) |
| Cognito groups     | `operators`, `system_admins`, `crwa_admins`                   |

CRWA admins operate with an explicit selected-tenant context for any tenant-scoped read/write (never implicit cross-tenant scan in member APIs).

Role enforcement (Pilot D1–D3):

| API | Who |
| --- | --- |
| `POST /admin/tenants` | `crwa_admin` only — creates `META#profile` + Cognito initial user |
| `GET /admin/tenants` | `crwa_admin` — registry under `TENANT#_registry` / `TENANT#{id}` (includes `billingStatus`, plan, meter estimate) |
| `POST /admin/users/invite` | `system_admin` — tenant from JWT only; client `tenantId` override → 403 |
| `GET /admin/users` | `system_admin` (or `crwa_admin` with tenant claim) |
| `GET /admin/tenants/{tenantId}/billing` | `crwa_admin` — billing profile + `BILL#EVENT` ledger |
| `POST /admin/tenants/{tenantId}/billing/{action}` | `crwa_admin` — `record-payment` \| `extend-pilot` \| `mark-past-due` \| `suspend` \| `reactivate`; path slug validated; never trust body `tenantId` |
| `GET /billing` | `system_admin` — JWT tenant only; public membership status + ledger (no internal notes) |

## Storage conventions

| Store                 | Keying / design                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **S3 uploads**        | Bucket per env; keys `tenants/{tenant_id}/uploads/...` (customer) or `tenants/{tenant_id}/uploads/sources/...` (source CSVs; G2) |
| **DynamoDB (chosen)** | Single-table `water-saver-{env}-data`; `pk=TENANT#{tenantId}`, `sk=LOC#…` / `RDG#…` / `MAP#…` / `SRC#…` / `SRD#…` / `ALERT#STATUS#…` / `CFG#…` / `META#…` / `USER#…` / `BILL#EVENT#…` |
| Meter locations       | `sk=LOC#{meterId}`; **service address stable**; occupant name mutable; optional asset fields (manufacturer, model, serialNumber, meterSize, installDate, meterType, locationDetail, radioId, lastTestedAt, notes); **DELETE `/meters/{meterId}`** removes `LOC#` and cascades all `RDG#{meterId}#…` for that tenant only (mirrors SRC→SRD cascade) |
| Readings              | `sk=RDG#{meterId}#{isoTimestamp}`; denormalized address for alert visibility                  |
| Named sources (G1)    | `sk=SRC#{sourceId}`; name + type (well/spring/purchase/other); tenant PK only; DELETE cascades `SRD#` |
| Source readings (G2)  | `sk=SRD#{sourceId}#{isoTimestamp}`; period volume or cumulative; tenant PK only               |
| Column mappings       | `sk=MAP#customer_readings` or `MAP#source_readings` remembered per tenant                     |
| Alert status (C3)     | `sk=ALERT#STATUS#{alertId}`; acknowledged/resolved + `actorUserId` / `actorEmail` / `updatedAt` |
| Balance thresholds (G4) | `sk=CFG#balance_thresholds`; per-tenant overrides of Spec §7a defaults; audit who/when      |
| Meter inventory (C7/B9) | `GET/POST /meters` list + create without reading; `GET/PUT/DELETE /meters/{meterId}`; JWT tenant only; PUT rejects address relocate |
| Meter history (C5/B8) | Read/update path: `LOC#{meterId}` + `RDG#{meterId}#…` via `GET/PUT /meters/{meterId}` (JWT tenant only; PUT is metadata only — no address relocate) |
| Tenant profile (D3)   | `sk=META#profile`; registry mirror `pk=TENANT#_registry` / `sk=TENANT#{tenantId}`             |
| Tenant users (D2)     | `sk=USER#{email}`; role + audit; Cognito is source of auth, Dynamo is invite roster           |
| Membership billing (Epic I) | Profile fields on `META#profile` (+ registry mirror): `billingStatus`, `billingMode`, `planCode`, `meterCountEstimate`, `pilotExpiresAt`, `lastPaymentAt`, `billingContactEmail`, `billingNotes`, `paymentProvider` (`none` until I4). Ledger: `sk=BILL#EVENT#{iso}#{id}`. Spec §9; [BILLING.md](BILLING.md). **No processor SDK until I3 decision.** |
| Conversation history  | `sk=CONV#{userId}#{iso}#{messageId}` under tenant PK (Epic E1)                                |
| Water balance periods | Pilot: UTC calendar `YYYY-MM` (Spec §7a); configurable cycles later (G4/G5)                    |

Aurora was considered for A4; DynamoDB is the MVP default for serverless cost and tenant keying. Revisit if reporting needs heavy SQL.


## API enforcement

1. JWT authorizer validates Cognito token.
2. Handler parses claims → `AuthContext`.
3. `requireTenantId(auth)` (or CRWA selected-tenant) before data access.
4. Repository layer accepts `tenantId` as a required parameter — no global list endpoints for member data.

## IAM notes (shared Lambda role) — A6 progress

MVP Lambdas share one execution role. Hardening in place:

- S3 object access limited to `tenants/*` keys (not the whole bucket).
- DynamoDB access conditioned on `dynamodb:LeadingKeys` matching `TENANT#*`.
- Explicit **Deny** on `dynamodb:Scan` for the data table (blocks accidental table-wide reads).
- Bedrock `Converse` limited to Nova Lite / Micro foundation-model ARNs in this region.

**Residual (honest):** true per-tenant IAM isolation (unable to touch another `TENANT#…` even if app bugs) still needs session tags / ABAC or per-tenant roles. Shared Lambda role + LeadingKeys is a measurable improvement, not full ABAC. Do not invent broken STS session-tag infra in this pilot — track full ABAC as follow-on before production multi-municipality scale.

## AI

Prompts and retrieval context are built only from the caller's tenant. Conversation history is `sk=CONV#{userId}#…` under `TENANT#{tenantId}`. Automated tests (ticket E5) fail if another tenant's ids appear in agent context.

## Audit

Acknowledge/resolve alert, mapping changes, retention changes, billing ledger events, and destructive actions write an audit event with `tenant_id`, actor, and timestamp.
