# Spec Kit dual-repo workspace

Water Saver uses [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven feature work.
The **upstream toolkit** is referenced beside this product — it is **not** Assessment III product code.

## Layout

| Piece | Location | In Water Saver git? |
|-------|----------|---------------------|
| Product app + `specs/` + constitution | this repo | Yes |
| Cursor Spec Kit skills (`/speckit-*`) | `.cursor/skills/speckit-*` | Yes (agent tooling) |
| Spec Kit shared templates / scripts | `.specify/templates`, `.specify/scripts`, `.specify/workflows` | Yes |
| Upstream Spec Kit source + docs | `~/spec-kit` (sibling of this folder) | **No** |
| Dual-root workspace | [`water-saver.code-workspace`](../water-saver.code-workspace) | Yes |

```text
~/Colorado Rural Water/     ← product (this repo)
~/spec-kit/                 ← upstream clone (v0.15.2), not product
```

## Open in Cursor

1. Clone upstream once per machine (if missing):

```bash
git clone --depth 1 --branch v0.15.2 https://github.com/github/spec-kit.git ~/spec-kit
```

2. Open **File → Open Workspace from File…** and choose `water-saver.code-workspace` (or open that file from Finder).

You should see two roots: **Water Saver** and **Spec Kit (upstream, not product)**.

## CLI

```bash
specify --version   # expect 0.15.2+
specify self check
```

Upgrade:

```bash
specify self upgrade --tag v0.15.2
```

## What to edit where

- **Product principles:** [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) (Water Saver Assessment III constitution — keep this).
- **Feature specs / plans / tasks:** `specs/<id>-*/` in this repo.
- **Read upstream templates / methodology:** browse the **Spec Kit** workspace root (`~/spec-kit`), especially `README.md` and `spec-driven.md`.
- **Do not** copy the upstream tree into this git history or treat Spec Kit as a rubric deliverable.

## Agent skills (Cursor)

After `specify init --here --integration cursor-agent`, skills live under `.cursor/skills/`:

- `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`
- Optional: `/speckit-clarify`, `/speckit-analyze`, `/speckit-checklist`, `/speckit-taskstoissues`

Use these against the **Water Saver** root. The sibling folder is for reading upstream docs/templates, not for implementing product features inside `~/spec-kit`.
