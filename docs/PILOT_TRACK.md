# Pilot / production track (post-Assessment)

Assessment III and Kelly demo scope are **closed**. Hosted product lives at:

| Surface | URL / command |
| ------- | ------------- |
| SPA (CloudFront) | `https://d1gokx5wxrd4x6.cloudfront.net` |
| Review | `/review` on SPA |
| Deploy | `./scripts/deploy-spa.sh` (after `terraform apply`) |
| Terraform | workspace `dev` · account `388691194728` · tag `Assessment-iii` |

**Authority:** [SPEC.md](SPEC.md) §0 Pilot hardening. Do not expand into vNext (payment Epic I, gated write tools, live MFA) without moving items in §0.

---

## P0 — keep hosted prod healthy

| # | Item | Status | Notes |
| - | ---- | ------ | ----- |
| 1 | Terraform Apply CI green | **in progress** | demo-access upsert fixed 2026-08-08; deploy-spa CI profile fix same day |
| 2 | Post-apply SPA sync | **in progress** | `sync-hosted-environment.sh` → `ng build --configuration hosted` → S3 + invalidation |
| 3 | Cognito demo + Kelly users | ops | Set `WATERSAVER_*` secrets in GitHub `production` environment |
| 4 | Surface prove register | **done** | [correctness-surface-passes.md](correctness-surface-passes.md) + [PROVE_FEATURES.md](PROVE_FEATURES.md) 2026-08-08 |

---

## P1 — first pilot municipalities (3–10 towns)

From Spec §0 Pilot hardening — ship in this order:

1. **C3 persistence** — acknowledge / dispatch / resolve + audit trail (not session-only)
2. **H3 Confidence store** — real calculator + persisted tier (replace heuristic-only path)
3. **D1–D3 roles** — System Admin invite, operator gates hardened, JWT group drift tests
4. **G4 tenant thresholds** — configurable balance Watch/Actionable defaults per tenant
5. **E Epic** — Assistant onboarding interview polish, cost confirm, Confidence coaching in replies
6. **D5 MFA** — live Account enrollment + login challenge (Pilot ops)
7. **D4 + H5 CRWA roll-up** — multi-tenant summary for CRWA admins

---

## P2 — operator quality (after first town live)

- G5 richer balance viz · G6 CRWA balance summary
- C4/C5 export + meter history already proved — wire to persisted alert state
- Per-meter Confidence · configurable reading cycles (beyond UTC month)
- A6 true per-tenant IAM ABAC
- Sources geocode label quality (fuller place strings for Suggest pin)

---

## Deferred (vNext — do not start)

- Payment Epic I3–I8 (processor discovery)
- Agent mutating tools / auto config writes (Phase F)
- Real-time AMI, resident portal, billing write-back, custom ML

---

## Agent workflow

1. Pick a P0/P1 row; open or create Spec Kit feature under `specs/` if large.
2. Unit tests + browser prove per [PROVE_FEATURES.md](PROVE_FEATURES.md).
3. `terraform apply` or `./scripts/deploy-spa.sh` for hosted changes.
4. Update this file and [action-items.md](action-items.md) when a row ships.
