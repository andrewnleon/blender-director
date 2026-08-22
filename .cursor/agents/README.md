# Cursor Agents — 3d Building

Plan-first workflow: **Orchestrator** · **`.cursor/agents/core/workflow.md`**. Routing: **`.cursor/playbooks/core/TASK_ROUTER.md`**. Task tool mapping: **`SUBAGENT_MAP.md`**.

Specialists live in this folder; canonical role routing and when-to-use guidance live in `SUBAGENT_MAP.md`.

## Agents

| Role              | File                 | Use when                                                                                 |
| ----------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| Orchestrator      | `orchestrator.md`    | Full-mode feature planning; caveman always-on; loads brainstorming -> maestro -> caveman |
| Product Manager   | `product-manager.md` | Scope, acceptance criteria, requirements, feature definition                             |
| UI Engineer       | `ui-engineer.md`     | Components, layout polish (no redesign without approval)                                 |
| API Engineer      | `api-engineer.md`    | Routes, server actions, auth                                                             |
| Data Engineer     | `data-engineer.md`   | Data structures, data integrations, migrations                                           |
| QA Engineer       | `qa-engineer.md`     | Vitest, Playwright, feature testing, validation, bug identification, code review         |
| Security Engineer | `security.md`        | CSP, secrets, auth hardening, front-end security                                         |

- `orchestrator.md` — Full-mode planning and delegation
- `product-manager.md` — scope and acceptance criteria
- `lead-engineer.md` — architecture and dependency decisions
- `ui-engineer.md` — app-ui + shadcn UI implementation
- `api-engineer.md` — route handlers and server actions
- `data-engineer.md` — Drizzle schema and migration flow
- `qa-engineer.md` — test strategy and verification evidence
- `security.md` — auth boundaries and hardening
- `ai-architect.md` — AI feature design (optional)

Communication: caveman always on — `.cursor/skills/caveman/SKILL.md`.
