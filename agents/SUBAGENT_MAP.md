# Subagent map

When Orchestrator delegates via Cursor **Task** tool, pick the right `subagent_type`. Local `.cursor/agents/*.md` files define role behavior; Task subagents are runtime workers.

## Local agents → Task subagents

| Local agent     | Task `subagent_type` | When to use                                                  |
| --------------- | -------------------- | ------------------------------------------------------------ |
| orchestrator    | `orchestrator`       | Full-mode feature planning and multi-specialist coordination |
| product-manager | `product-manager`    | Scope, acceptance criteria, requirements, feature definition |
| lead-engineer   | `lead-engineer`      | Architecture, deps, cross-cutting refactors, deploy          |
| ui-engineer     | `ui-engineer`        | Components and layout polish (no redesign without approval)  |
| api-engineer    | `api-engineer`       | Routes, server actions, API contracts                        |
| data-engineer   | `data-engineer`      | Data structures, integrations, and migrations                |
| qa-engineer     | `qa-engineer`        | Vitest, Playwright, feature testing, validation, bug review  |
| security        | `security`           | CSP, secrets, auth hardening, and front-end security         |
| ai-architect    | `ai-architect`       | AI feature design (when ai-sdk skill installed)              |

Platform subagents are available for search, shell, CI, deploy, and performance tasks when local specialists are not the best fit.

## Deterministic routing policy for /orcha

Always assign exactly one primary owner in this order:

1. Security/auth/secrets -> `security`
2. Data schema/integrations/migrations -> `data-engineer`
3. API routes/server actions/contracts -> `api-engineer`
4. UI components/layout polish -> `ui-engineer`
5. Test strategy/coverage/e2e validation -> `qa-engineer`
6. Architecture/dependencies/deploy changes -> `lead-engineer`
7. Scope/requirements/acceptance definition -> `product-manager`
8. AI feature design -> `ai-architect`
9. Multi-domain orchestration -> `orchestrator`

Tie-break: use the highest-priority matching domain as primary owner; add secondary reviewers only if evidence is missing.

Lean no-delegate: one-file low-risk fixes should not use Task delegation.

## Review trigger matrix

Use this matrix before delegating review tasks:

1. Auth/session/token/secrets touched -> `security` (mandatory)
2. Tests missing or weak for changed behavior -> `qa-engineer` (mandatory)
3. API route or response contract changes -> `api-engineer`
4. Schema/integration/migration changes -> `data-engineer`
5. UI behavior/accessibility uncertainty -> `ui-engineer`
6. Cross-cutting dependency or architecture changes -> `lead-engineer`

Numeric gates:

1. Delegate if risk score >= 3.
2. Delegate if confidence < 0.75.
3. Keep one primary owner; at most one secondary reviewer unless incident severity is critical.

## Routing shortcuts

| Situation             | Prefer                                      |
| --------------------- | ------------------------------------------- |
| Find where code lives | `explore`                                   |
| Feature with 3+ files | `orchestrator` → Execution Plan             |
| Single-file bug       | Lean mode → one specialist, no Task         |
| UI component          | `ui-engineer` (+ app-ui + shadcn in prompt) |
| Production incident   | `/orcha` → `systematic-debugging` skill     |
| PR check failed       | `ci-investigator`                           |
| Slow page / bundle    | `performance-optimizer`                     |

## Prompt craft

All Task delegations: follow `.cursor/skills/maestro/SKILL.md` (role, goal, context, instructions, output, boundaries, verification).

UI Tasks **must** include: load app-ui and shadcn.
