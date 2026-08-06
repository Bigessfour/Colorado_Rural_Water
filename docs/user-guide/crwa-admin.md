# Water Saver — CRWA admin guide

For Colorado Rural Water Association staff who provision member systems, invite users, and review multi-system roll-up. Municipal operators should use the **Operator guide** instead.

Open this guide anytime under **More → Settings → Help & guides**.

## Who can do what

- **CRWA Admin** — provision municipalities, membership billing actions, CRWA roll-up, Admin screens
- **System Admin** (at a member town) — invite users **only for their own system**, view that town’s billing
- **Operator** — day-to-day product use; no Admin provisioning

Your JWT carries roles and (for town users) `tenant_id`. Member APIs never accept a client “switch town” override.

## Sign in

1. Sign in with your CRWA admin account.
2. Confirm **More → Admin** and **More → CRWA** appear in the nav.
3. If Admin says Operator-only, your Cognito groups are missing `crwa_admins` (or `system_admins` for invite-only).

## Add a new municipality (provision)

This creates the water system, billing profile, and **one initial user**.

1. Open **More → Admin**.
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

The new system appears under **Municipalities** on the same page.

## Invite another user to a member system

Invites always stay inside the **signed-in system admin’s municipality**. There is no cross-tenant invite from the SPA.

### As a town System Admin

1. Sign in as that town’s System Admin.
2. Open **More → Admin**.
3. Under **Invite user to your system**, enter email and role (**Operator** or **System Admin**).
4. Click **Invite user**.
5. Copy the **temporary password** (shown once) and send it to the person securely.
6. They sign in → complete new password if required → land on Dashboard for **that town only**.

### As CRWA creating the first user

Use **Provision municipality** (above) — that creates the initial user. Additional users: either temporarily use a System Admin session for that town, or have the town’s System Admin run Invite.

## Membership billing (offline / pilot)

Payment processors are not wired yet. Record offline activity from Admin:

1. **More → Admin → Membership billing actions**
2. Select the municipality
3. Choose an action (record payment, extend pilot, mark past due, and related options)
4. Apply — each change is logged for that municipality

Town System Admins can open **More → Billing** for a read-only view of their own membership status.

## CRWA roll-up

1. Open **More → CRWA**.
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
- Invite and user list are scoped to the System Admin’s tenant
- CRWA roll-up is sanitized (no PII)
- Assistant retrieval is filtered to shared Colorado guidance plus that tenant’s SOPs

## Troubleshooting

- **Admin hidden** — need `crwa_admins` and/or `system_admins` Cognito group
- **Invite failed / wrong town** — you must be System Admin for that municipality; client cannot override tenant
- **Temporary password lost** — invite again or reset via Cognito ops (not self-service in-app yet)
- **Map empty** — set Map town on provision; fine-tune pins under Meters

## Related docs (engineering)

- In-app Operator guide: open **Settings → Help & guides → Operator guide** (`/help/tenant`)
- Tenant isolation (engineers): see `docs/TENANT_ISOLATION.md` in the repo
- Kelly invite ops notes: see `docs/KELLY_INVITE.md` in the repo
