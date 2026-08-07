# Water Saver — Operator guide (municipal users)

For clerks and operators at a member water system. Your account only sees **your** municipality — the app never lets you switch towns.

Open this guide anytime under **More → Settings → Help & guides**.

## Sign in

1. Open Water Saver and go to **Sign in**.
2. Enter the email and password you were given (or the temporary password from an invite).
3. If asked for a **new password**, choose one you will remember and continue.
4. You land on the **Dashboard**.

Forgot password or locked out? Contact your System Admin or CRWA.

## First-time setup (recommended)

1. Open **More → Onboarding** and complete the short intake (contacts, meters/wells, how you export readings, Path A–D inventory).
2. Open **More → Settings** to pick Light or Dark display, and replay the product tour if you want a highlighted walkthrough.
3. Optional: **More → Account** for password change (authenticator / MFA is optional Pilot).

## Upload meter readings

1. Go to **Upload**.
2. Choose your municipal export (CSV or Excel). Messy column names are OK.
3. Use the column mapper so fields like meter id, date, and reading map correctly. Unused columns stay unused.
4. Confirm the import. Partial skips are fine — the app tells you what landed.

Tip: Ask the **Assistant** (“Ask Assistant to map”) after headers load if you want mapping suggestions. Always confirm before import.

## Sources (wells / production)

1. Go to **Sources**.
2. Add named wells or plants (for example Well 1 – North).
3. Optional map pin: enter a **place / road label**, use **Suggest pin from label**, or turn on **Fine-tune** and drag/click the map (same idea as Meters).
4. Enter or upload production readings for the same periods as customer readings when you can.
5. Water balance on the Dashboard needs **both** produced and billed for a period.

## Dashboard

Use the Dashboard for a calm overview:

- **In / Out / Unaccounted** for the selected period
- Trend charts (produced, billed, unaccounted)
- **Data Confidence** — how much comparable history you have, **not** “leak accuracy”
- Watch vs Actionable cues for signals

Thin history stays **Watch** (look when you can). Hardware stuck / clear diagnostic flags can be **Actionable**.

## Meters

1. Go to **Meters**.
2. Switch **Table**, **Map**, or **Both**.
3. Add, edit, or remove meters as needed. Map pins use coordinates when known; otherwise the map centers on your town.

## Alerts → field → Resolve (clerk workflow)

Typical path from desk to truck and back:

1. **Clerk** opens **Alerts** and reviews Watch vs Actionable rows.
2. For dig / visit work, open **More → Reports** and run **Printable field work-order sheets** (one page per Actionable meter). Use Browser Print → PDF or print for the truck. CSV/Excel exports remain available for shared lists.
3. Optionally **Dispatch** the alert in Alerts so the status shows in progress.
4. **Field** uses the sheet (address, coords, map link, Confidence note, recommended action) and writes on the blank **Field notes** area.
5. After the visit, clerk or operator opens **Alerts** → **Resolve** and enters a short note. That closes the loop on meter history.

Remember: Watch means look when you can; Actionable may need a field check. The product does not claim “we found a leak.”

## Reports

1. Open **More → Reports**.
2. **All report processes** — catalog of available exports.
3. **Run reports** — download flagged work orders (CSV or Excel), open **printable field sheets** (HTML → Print → PDF), or open the operations summary.
4. **Recent activity** — what you ran in this browser session.

Work orders include address, Confidence note, recommended action, and a map link when coordinates exist. Printable sheets are Actionable-only, one meter per page.

## Assistant

1. Open **More → Assistant**.
2. Ask day-to-day questions (alerts, Confidence, residual guidance, column mapping).
3. Answers that use Colorado guidance show **sources** when available.
4. The Assistant only knows **your** system’s data — it will not invent other towns’ documents.

## Review (feedback for CRWA)

1. Open **Review** in the main nav.
2. Walk the steps, rate what you saw, and submit when ready.
3. Use this when CRWA asks for product feedback.

## Settings & Account

- **Settings** — theme, product tour, session profile, **Help & guides**, links to Account / Onboarding / Reports
- **Account** — password (and MFA when your org enables it)

## Roles at a glance

- **Operator** — day-to-day upload, meters, alerts, reports, Assistant
- **System Admin** — everything Operators can do, plus **Users → Invite** for *your* system only and membership billing view
- Operators and System Admins cannot provision other municipalities (that is **CRWA** only)

## Need help?

- Replay the product tour from **Settings**
- Read the **CRWA admin guide** if you are association staff (Settings → Help & guides)
- Contact your System Admin or CRWA support contact for account issues
