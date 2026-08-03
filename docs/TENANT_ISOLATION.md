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

## Storage conventions

| Store                 | Keying / design                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **S3 uploads**        | Bucket per env; keys `tenants/{tenant_id}/uploads/...` (customer) or `tenants/{tenant_id}/uploads/sources/...` (source CSVs; G2) |
| **DynamoDB (chosen)** | Single-table `water-saver-{env}-data`; `pk=TENANT#{tenantId}`, `sk=LOC#…` / `RDG#…` / `MAP#…` / `SRC#…` / `SRD#…` |
| Meter locations       | `sk=LOC#{meterId}`; **service address stable**; occupant name mutable                         |
| Readings              | `sk=RDG#{meterId}#{isoTimestamp}`; denormalized address for alert visibility                  |
| Named sources (G1)    | `sk=SRC#{sourceId}`; name + type (well/spring/purchase/other); tenant PK only; DELETE cascades `SRD#` |
| Source readings (G2)  | `sk=SRD#{sourceId}#{isoTimestamp}`; period volume or cumulative; tenant PK only               |
| Column mappings       | `sk=MAP#customer_readings` or `MAP#source_readings` remembered per tenant                     |
| Conversation history  | Partitioned by `tenant_id` + user (Epic E)                                                    |
| Water balance periods | Pilot: UTC calendar `YYYY-MM` (Spec §7a); configurable cycles later (G4/G5)                    |

Aurora was considered for A4; DynamoDB is the MVP default for serverless cost and tenant keying. Revisit if reporting needs heavy SQL.


## API enforcement

1. JWT authorizer validates Cognito token.
2. Handler parses claims → `AuthContext`.
3. `requireTenantId(auth)` (or CRWA selected-tenant) before data access.
4. Repository layer accepts `tenantId` as a required parameter — no global list endpoints for member data.

## IAM notes (shared Lambda role)

MVP Lambdas share one execution role. Hardening in place:

- S3 object access limited to `tenants/*` keys (not the whole bucket).
- DynamoDB access conditioned on `dynamodb:LeadingKeys` matching `TENANT#*`.

True per-tenant IAM (unable to touch another `TENANT#…` even if app bugs) needs session tags / ABAC or per-tenant roles — track as a hardening ticket before production multi-municipality scale.

## AI

Prompts and retrieval context are built only from the caller's tenant. Automated tests (ticket E5) must fail the build if another tenant's ids or readings appear in agent context.

## Audit

Acknowledge/resolve alert, mapping changes, retention changes, and destructive actions write an audit event with `tenant_id`, actor, and timestamp.
