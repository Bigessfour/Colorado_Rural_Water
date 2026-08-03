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

| Store                      | Keying                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| S3 uploads                 | `tenants/{tenant_id}/uploads/...`                                         |
| Readings / meters / alerts | Partition or row attribute includes `tenant_id`; all queries filter on it |
| Meter locations            | Unique per tenant on `meter_id` (+ service address as display/location); occupant name is mutable attribute |
| Conversation history       | Partitioned by `tenant_id` + user                                         |

## API enforcement

1. JWT authorizer validates Cognito token.
2. Handler parses claims → `AuthContext`.
3. `requireTenantId(auth)` (or CRWA selected-tenant) before data access.
4. Repository layer accepts `tenantId` as a required parameter — no global list endpoints for member data.

## AI

Prompts and retrieval context are built only from the caller's tenant. Automated tests (ticket E5) must fail the build if another tenant's ids or readings appear in agent context.

## Audit

Acknowledge/resolve alert, mapping changes, retention changes, and destructive actions write an audit event with `tenant_id`, actor, and timestamp.
