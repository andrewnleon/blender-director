# Plan-First Workflow

**Canonical entry** for agent work. Default: **no code until plan approved** (Full mode).

Index: `.cursor/playbooks/core/TASK_ROUTER.md` · Stack profiles: `.cursor/playbooks/core/STACK_PROFILES.md` · Policy: `AGENTS.md`

## Modes

| Mode       | Use when                                   | Planning                    |
| ---------- | ------------------------------------------ | --------------------------- |
| **Full**   | New features, migrations, multi-route work | Orchestrator Execution Plan |
| **Lean**   | Single file, copy, localized bug           | Short plan: files + AC      |
| **Hotfix** | Critical bug, crash, data leak             | `/diagnose` first           |

## Phase 1 — Intake

1. Consult TASK_ROUTER.md.
2. If `.maestro/context.md` is empty, run context intake per `STACK_PROFILES.md`.
3. Select one stack profile using `STACK_PROFILES.md` (state explicit vs inferred).
4. If profile remains unclear, use `generic` and state limitations.
5. Classify Full / Lean / Hotfix.
6. Stop and ask if request implies **redesign** without explicit OK.

## Phase 2 — Plan (Full)

Orchestrator or `/plan` produces Execution Plan. User approves → Phase 3.

Execution Plan must report selected `stack_profile` and rationale.

Lean: state **files**, **acceptance criteria**, **test commands** before editing.
Lean must also state selected `stack_profile` and rationale.

## Phase 3 — Implement

Execute plan order. Specialists in `.cursor/agents/`.

UI: `app-ui` + `shadcn`. No redesign without explicit approval.

## Phase 4 — Verify

Run quality gates. Use `verification-before-completion` skill before done.
