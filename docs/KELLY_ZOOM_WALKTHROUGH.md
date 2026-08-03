# Water Saver — Zoom Walkthrough with Kelly Stone

**Audience:** Kelly Stone, Colorado Rural Water Association  
**Format:** You share screen; he watches and comments  
**Length:** ~15–20 minutes (+ time for discussion)  
**Tone:** Calm, practical, built for small rural systems — not an enterprise pitch

---

## Before the call (you only)

| Item | Check |
|------|--------|
| Live app URL open in a clean browser window | |
| Demo operator signed in (or credentials ready) | |
| Messy customer file ready: `sample-data` / Town of Steve export | |
| Source readings file ready (or 2–3 source names in mind) | |
| Notifications off; zoom 110–125% if UI is dense | |
| One sentence goal ready (below) | |

**Your goal in one sentence**  
Show that a clerk can load messy meter data and quickly see trends, water balance, and clear alerts — without calling CRWA for help.

---

## 1. Open (about 1 minute)

**On screen:** Login page or dashboard already signed in.

**Say:**  
“This is a working pilot for a CRWA-branded tool we’re calling Water Saver for now. It’s meant for small systems — people like Wiley’s operators — to catch unusual usage and meter problems before customers get a surprise bill. I’ll walk the main path; interrupt anytime.”

**Do not:** List every feature or the full roadmap.

---

## 2. Sign-in (if not already in)

| You do | You say |
|--------|---------|
| Click into **Email**, enter demo user | “Operators sign in with email and password. MFA is optional later; we won’t dig into that today.” |
| Click into **Password**, enter password | |
| Click **Sign in** | “Land on the home dashboard for their system only.” |

**Point out:** One municipality’s data — not a shared pool of all CRWA members.

---

## 3. Dashboard first glance (about 2 minutes)

**On screen:** `/dashboard`

| You point to | You say |
|--------------|---------|
| KPI / summary row | “At a glance: meters, open alerts, balance %, Confidence.” |
| **System usage** chart | “Billed usage over time. The shaded band is a typical range from recent months — not a leak model. Points outside are worth a look.” |
| **Data Confidence** doughnut | “This is how much history we have — not a claim that we found a leak. Thin history means we stay cautious.” |
| **Meter health** doughnut | “Normal vs Watch vs Actionable — portfolio feel for a small system.” |
| Alert feed | “Priority list. **Watch** means look when you can. **Actionable** is stronger — for example a stuck meter. History shows a usage sparkline.” |
| Water balance **bars** | “Produced vs billed vs unaccounted as a picture for this period. If we’re missing one side, it says so plainly instead of inventing a number.” |

**Pause:** “Any of that unclear before we load data?”

---

## 4. Upload messy readings (about 4 minutes)

**Navigate:** Open **Upload** (or equivalent nav label).

| You do | You say |
|--------|---------|
| Click **Choose file** / drop zone | “Clerks often get imperfect CSVs from billing or handhelds. We designed for that.” |
| Select the messy sample file | “This one has mixed dates, odd column names, and a few problem meters on purpose.” |
| If mapper appears: match **Meter ID**, **Date**, **Reading**, **Unit** | “When columns aren’t obvious, the mapper asks in plain language — not error codes.” |
| Confirm / **Import** or **Save mapping** | “One successful load should be enough to unlock the dashboard story.” |
| Wait for success message | “If something’s wrong, the message should be readable by a non-technical clerk.” |

**Then:** Return to **Dashboard** (click **Dashboard** in nav).

| You point to | You say |
|--------------|---------|
| Updated trends / KPIs | “Same screens, now with their data.” |
| Any Watch / Actionable rows | “We’ll open alerts next.” |

---

## 5. Alerts (about 3 minutes)

**Navigate:** Click **Alerts**.

| You do | You say |
|--------|---------|
| Show the list | “Unusual usage, stuck or flat meters, drops, flags from the file, and balance issues when we have both sides.” |
| Point at a **Watch** tag | “Not ‘go dig tonight’ — ‘worth a look.’” |
| Point at an **Actionable** example if present (e.g. stuck / low battery) | “Clearer reason to check the field or the meter.” |
| Optional: select one row → **History** | “Usage sparkline so a stuck meter looks flat — not only a label.” |
| Optional: **Act on alert** → Accept / Dispatch / Resolve | “So the team can mark what they’ve seen, with a note.” |
| Optional: **Export** if visible | “List for the truck or the board packet.” |

**Do not say:** “We found a leak.”

**Better:** “This is where the system surfaces what deserves attention.”

---

## 6. Sources and water balance (about 3 minutes)

**Navigate:** Click **Sources**.

| You do | You say |
|--------|---------|
| Click **Add** (or **New source**) | “Name the wells or entry points the town actually uses.” |
| Field **Name**: e.g. `North Well` | “Simple names operators already use.” |
| Save; add a second source if useful | “Two or three is enough for a small system.” |
| Enter or upload a **source reading** for a period | “Production for the same kind of period as customer reads.” |
| Return to **Dashboard** | “Balance needs both sides. When we have them, you see in, out, and unaccounted.” |

**Point to balance bars:** Produced | Billed | Unaccounted — or the calm empty / muted state if one side is missing.

---

## 7. Optional deeper stops (only if time or he asks)

Keep each under a minute.

| Nav | One line |
|-----|----------|
| **Meters** | “Inventory: install date, brand, model — the physical asset list.” |
| **Assistant** | “Plain-language help on alerts and setup — not a black box.” |
| **CRWA** (if you use a CRWA login) | “Your view: sanitized roll-up across members, not everyone else’s raw meters.” |
| **Billing** | “Membership status for the tool — pilot vs paid — separate from the town’s customer billing system.” |

Skip cleanly: “We can go deeper on any of these in a follow-up.”

---

## 8. Close (about 2 minutes)

**On screen:** Dashboard again (home base).

**Say:**  
“That’s the core path: load messy data, see trends and balance, act on clear alerts. We want this to feel like it was built for small systems, not stripped down from a big-city product.”

**Ask (pick 2–3, don’t fire all):**
- “Where would this help your members most?”
- “What would get in a clerk’s way?”
- “Anything here you don’t need?”
- “Anything missing you’d expect in a first pilot?”

**Feedback capture (choose one and say it out loud):**
- “I’ll send a short one-pager after this — Love / Don’t need / Change / Need something new — per area.”  
  **or**
- “If it’s easier, reply by email with those four labels and we’ll work from that.”

**Thank him:** Time + candor matter more than polish.

---

## Phrases to use

- “Watch means look when you can.”
- “Thin history — we’re careful on purpose.”
- “Built for rural operators, not enterprise dashboards.”
- “CRWA membership billing for the tool is separate from the town’s customer bills.”

## Phrases to avoid

- “AI detected a leak”
- “Production-ready for every member tomorrow”
- Long architecture or AWS digressions
- Apologizing for every Pilot gap — note once: “Some admin and inventory pieces are still thickening for pilot.”

---

## Timing cheat sheet

| Block | Minutes |
|-------|---------|
| Open + sign-in | 1–2 |
| Dashboard | 2 |
| Upload | 4 |
| Alerts | 3 |
| Sources + balance | 3 |
| Optional | 0–3 |
| Close + questions | 2–5 |
| **Total** | **~15–20** |

---

## After the call (you)

1. Send thank-you + the four feedback labels (by section: Dashboard, Upload, Alerts, Balance, Other).  
2. Triage into: keep / change / defer / build.  
3. Only then schedule Pilot expansion work.

This script is the walkthrough. Checklists and inventory tools stay internal unless he asks how you verify quality.
