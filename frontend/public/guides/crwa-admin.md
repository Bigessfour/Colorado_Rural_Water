# Water Saver — CRWA admin guide

For Colorado Rural Water Association staff who provision member systems, manage membership billing, and review multi-system roll-up. Municipal operators and town System Admins should use the **Operator guide** (and **Users** for invites) instead.

Open this guide anytime under **More → Settings → Help & guides**.

## Who can do what

| Role | Where | What |
| ---- | ----- | ---- |
| **CRWA Admin** | **More → CRWA** | Provision municipalities, membership billing actions, enterprise roll-up |
| **System Admin** (member town) | **More → Users** + **Billing** | Invite users **only for their own system**; read that town’s membership status |
| **Operator** | Product pages | Day-to-day upload, meters, alerts, reports — no provisioning |

Your JWT carries roles and (for town users) `tenant_id`. Member APIs never accept a client “switch town” override. Town System Admins never see the municipality registry or other towns’ data.

## Sign in

1. Sign in with your CRWA admin account.
2. Confirm **More → CRWA** appears (association tools).
3. If you also hold a town System Admin role, **More → Users** appears for *that* town’s invites only.
4. If CRWA is missing, your Cognito groups are missing `crwa_admins`.

## Add a new municipality (provision)

This creates the water system, billing profile, and **one initial user**.

1. Open **More → CRWA**.
2. Under **Provision municipality**, fill in:
   - **System id (slug)** — lowercase id such as `town-wiley` (stable; used in data keys)
   - **Display name** — e.g. Town of Wiley
   - **Map town** — Colorado place name for map centering (optional; defaults to display name)
   - **Initial user email** — first clerk / system admin email
   - **Initial role** — usually System Admin
   - **Pilot or paid** and **plan band**
   - Optional meter estimate, billing contact, pilot expiry, notes
3. Click **Provision system**.
4. Copy the **temporary password** shown once and share it securely with the initial user.
5. Ask them to sign in, set a new password if prompted, and complete **Onboarding**.

The new system appears under **Municipalities** on the same page and in **Enterprise roll-up**.

**Note:** Cognito users alone do not appear in roll-up. Provision (or restore the Dynamo municipality registry) writes the profile CRWA roll-up reads.

## Invite another user to a member system

Invites always stay inside the **signed-in System Admin’s municipality**. There is no cross-tenant invite from the SPA.

### As a town System Admin

1. Sign in as that town’s System Admin.
2. Open **More → Users** (not CRWA).
3. Enter email and role (**Operator** or **System Admin**).
4. Click **Invite user**.
5. Copy the **temporary password** (shown once) and send it securely.
6. They sign in → complete new password if required → land on Dashboard for **that town only**.

### As CRWA creating the first user

Use **Provision municipality** on **CRWA** — that creates the initial user. Additional users: have the town’s System Admin use **Users**, or sign in with a System Admin session for that town.

## Membership billing (offline / pilot)

Payment processors are not wired yet. Record offline activity from **CRWA**:

1. **More → CRWA → Membership billing actions**
2. Select the municipality
3. Choose an action (record payment, extend pilot, mark past due, and related options)
4. Apply — each change is logged for that municipality

Town System Admins can open **More → Billing** for a read-only view of their own membership status.

## CRWA roll-up

1. Stay on **More → CRWA**.
2. Click **Refresh roll-up**.
3. Review each system’s unaccounted water, period, **Data Confidence**, months of history, and billing status.
4. No customer names or service addresses appear here — use it to coach Thin vs Strong systems, not to dig individual meters.

## Coaching member operators

Point members to **Settings → Help & guides → Operator guide**, then the usual path:

1. Onboarding intake
2. Upload messy export → Sources → Dashboard balance
3. Alerts (Watch vs Actionable) → Reports work orders
4. Optional Assistant for residual / Confidence questions
5. Review when you want product feedback

## Isolation rules (say out loud)

- Every member API uses the JWT municipality — the browser cannot switch towns
- Invite and user list are scoped to the System Admin’s tenant (**Users** page)
- CRWA provision / registry / roll-up are association-only (**CRWA** page)
- Roll-up is sanitized (no PII)
- Assistant retrieval is filtered to shared Colorado guidance plus that tenant’s SOPs

## Troubleshooting

- **CRWA hidden** — need `crwa_admins` Cognito group
- **Users hidden** — need `system_admins` for that municipality
- **Invite failed / wrong town** — you must be System Admin for that municipality; client cannot override tenant
- **Temporary password lost** — invite again or reset via Cognito ops (not self-service in-app yet)
- **Roll-up empty after rebuild** — municipality registry missing; provision again or restore Dynamo `META#profile` / `TENANT#_registry`
- **Map empty** — set Map town on provision; fine-tune pins under Meters

## Related docs (engineering)

- In-app Operator guide: open **Settings → Help & guides → Operator guide** (`/help/tenant`)
- Tenant isolation (engineers): see `docs/TENANT_ISOLATION.md` in the repo
- Kelly invite ops notes: see `docs/KELLY_INVITE.md` in the repo
