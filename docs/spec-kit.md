# Spec Kit — Water Saver configuration

GitHub Spec Kit (CLI **0.15.2**) drives Assessment III / feature work under `specs/`.
Upstream toolkit clone (not product code): see [spec-kit-workspace.md](spec-kit-workspace.md).

## What’s installed

| Piece                        | Status                                                |
| ---------------------------- | ----------------------------------------------------- |
| CLI                          | `specify` 0.15.2 (`sh` scripts)                       |
| Default integration          | `cursor-agent` (skills in `.cursor/skills/speckit-*`) |
| Secondary integration        | `grok` (skills in `.grok/skills/speckit-*`)           |
| Constitution                 | `.specify/memory/constitution.md`                     |
| Active feature pointer       | `.specify/feature.json` → `feature_directory`         |
| Project / Assessment pointer | `.specify/project.json`                               |
| Workflow                     | Full SDD cycle (`specify workflow list` → `speckit`)  |

### Extensions (enabled)

| Extension       | Purpose                                                                            | Skills                          |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| `agent-context` | Syncs plan pointer into `AGENTS.md`, `agent.md`, `.cursor/rules/specify-rules.mdc` | `/speckit-agent-context-update` |
| `git`           | Feature branches (`feature/00N-slug`), validate, remote; **auto-commit OFF**       | `/speckit-git-*`                |
| `assess`        | Idea intake → research → define → shape → decide (before specify)                  | `/speckit-assess-*`             |
| `bug`           | Bug assess → fix → test reports under `.specify/bugs/`                             | `/speckit-bug-*`                |

Config:

- Agent context: `.specify/extensions/agent-context/agent-context-config.yml`
- Git: `.specify/extensions/git/git-config.yml` (`branch_numbering: sequential`, `branch_prefix: feature`, `auto_commit.default: false`)
- Hook registry: `.specify/extensions.yml`

## Agent commands (Cursor / Grok)

Core SDD:

1. `/speckit-constitution` — governance principles
2. `/speckit-specify` — feature spec under `specs/<id>-*/`
3. `/speckit-clarify` — resolve open questions
4. `/speckit-plan` — implementation plan
5. `/speckit-tasks` — task breakdown
6. `/speckit-analyze` — cross-check before coding
7. `/speckit-implement` — execute tasks
8. `/speckit-converge` — brownfield gap / remaining work
9. `/speckit-checklist` · `/speckit-taskstoissues` — optional

Discovery / QA:

- `/speckit-assess-intake` → `…-research` → `…-define` → `…-shape` → `…-decide`
- `/speckit-bug-assess` → `…-fix` → `…-test`

Git helpers (hooks may offer these; auto-commit stays disabled until you enable it in `git-config.yml`):

- `/speckit-git-feature` · `/speckit-git-validate` · `/speckit-git-remote` · `/speckit-git-commit`

## Day-to-day

```bash
# From Water Saver repo root
specify --version          # 0.15.2+
specify integration status
specify extension list
specify self check
npm run spec-kit:smoke     # paths, executables, SPECKIT blocks

# Active feature (scripts)
bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only

# Refresh Spec Kit block in AGENTS.md, agent.md, Cursor rule
bash .specify/extensions/agent-context/scripts/bash/update-agent-context.sh
```

New feature sketch:

```bash
bash .specify/scripts/bash/create-new-feature.sh "Short description" --short-name my-feature
# then in Cursor: /speckit-specify <full description>
```

Or run `/speckit-git-feature` manually before `/speckit-specify` (the `before_specify` hook is **optional** so brownfield work does not force a branch switch).

**Metadata split:** `.specify/feature.json` holds only `feature_directory` (Spec Kit may overwrite it). Assessment / AWS / completed-feature lists live in `.specify/project.json`.

## Dual-agent note

- **Default:** `cursor-agent` (Cursor skills).
- **Grok:** installed with full core + extension skills under `.grok/skills/`.
- To make Grok the Spec Kit default: `specify integration use grok` (then `use cursor-agent` to switch back).
- Extension skills register for the _active_ integration on `use` / `switch`; both trees are already synced after setup.

## What not to do

- Do not treat `~/spec-kit` as Assessment product code.
- Do not enable git `auto_commit.default: true` unless you want Spec Kit to commit without asking.
- Do not put secrets in `.specify/` configs.
- Prefer editing constitution / `specs/` / `docs/SPEC.md` over inventing parallel process docs.

## Troubleshooting

| Symptom                    | Fix                                                                               |
| -------------------------- | --------------------------------------------------------------------------------- |
| Skills missing in Cursor   | Reload window; confirm `.cursor/skills/speckit-*`                                 |
| Skills missing in Grok     | `specify integration use grok` then `use cursor-agent`                            |
| `feature_directory` errors | Set `.specify/feature.json` or `SPECIFY_FEATURE_DIRECTORY`                        |
| Agent context stale        | Run `update-agent-context.sh` or `/speckit-agent-context-update`                  |
| Re-init after CLI upgrade  | `specify integration upgrade cursor-agent` (and grok); `specify extension update` |

## References

- Workspace layout: [spec-kit-workspace.md](spec-kit-workspace.md)
- Constitution: [../.specify/memory/constitution.md](../.specify/memory/constitution.md)
- Rubric map: [../specs/RUBRIC_COVERAGE.md](../specs/RUBRIC_COVERAGE.md)
- Upstream: https://github.com/github/spec-kit · local clone `~/spec-kit`
