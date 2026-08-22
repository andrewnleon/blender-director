# Subagent map

Orchestrator → Cursor **Task** tool: pick `subagent_type`. Local `.cursor/agents/*.md` = role + model. Task workers = runtime.

## Local agents → Task

| Local agent | `subagent_type` | Model (frontmatter) | When |
|-------------|-----------------|---------------------|------|
| orchestrator | `orchestrator` | composer-2.5[fast=false] | Full Execution Plan |
| product-manager | `product-manager` | composer-2.5[fast=false] | Scope, AC |
| lead-engineer | `lead-engineer` | composer-2.5[fast=false] | Architecture, deps, deploy |
| ui-engineer | `ui-engineer` | composer-2.5[fast=false] | UI; practical-ui + app-ui |
| api-engineer | `api-engineer` | composer-2.5[fast=false] | Routes, actions, contracts |
| data-engineer | `data-engineer` | composer-2.5[fast=false] | Drizzle (when DB) |
| qa-engineer | `qa-engineer` | composer-2.5[fast=false] | Vitest, Playwright |
| security | `security` | composer-2.5[fast=false] | OWASP, CSP, secrets, audit |
| ai-architect | `ai-architect` | composer-2.5[fast=false] | AI design (ai-sdk skill) |

## Platform subagents (no local `.md`)

| `subagent_type` | When |
|-----------------|------|
| `explore` | Fast codebase search (read-only) |
| `generalPurpose` | Multi-step research |
| `shell` | Git, terminal, CI debug |
| `deployment-expert` | Vercel, CI/CD, env, domains |
| `performance-optimizer` | CWV, bundle, cache |
| `ci-investigator` | One failing PR check |
| `bugbot` | User-requested code review |
| `security-review` | User-requested security review |
| `docs-researcher` | Library docs without context bloat |
| `cursor-guide` | Cursor product questions |

## Deterministic routing policy for /orcha

Always assign exactly one primary owner in this order:

1. Security/auth/secrets → `security`
2. Data schema/integrations/migrations → `data-engineer`
3. API routes/server actions/contracts → `api-engineer`
4. UI components/layout polish → `ui-engineer`
5. Test strategy/coverage/e2e validation → `qa-engineer`
6. Architecture/dependencies/deploy changes → `lead-engineer`
7. Scope/requirements/acceptance definition → `product-manager`
8. AI feature design → `ai-architect`
9. Multi-domain orchestration → `orchestrator`

Tie-break: use the highest-priority matching domain as primary owner; add secondary reviewers only if evidence is missing.

Lean no-delegate: one-file low-risk fixes should not use Task delegation.

## Review trigger matrix

Use this matrix before delegating review tasks:

1. Auth/session/token/secrets touched → `security` (mandatory)
2. Tests missing or weak for changed behavior → `qa-engineer` (mandatory)
3. API route or response contract changes → `api-engineer`
4. Schema/integration/migration changes → `data-engineer`
5. UI behavior/accessibility uncertainty → `ui-engineer`
6. Cross-cutting dependency or architecture changes → `lead-engineer`

Numeric gates:

1. Delegate if risk score >= 3.
2. Delegate if confidence < 0.75.
3. Keep one primary owner; at most one secondary reviewer unless incident severity is critical.

## Routing shortcuts

| Situation | Prefer |
|-----------|--------|
| Find where code lives | `explore` |
| Feature 3+ files | `orchestrator` → Execution Plan |
| Single-file bug | Lean → one specialist |
| UI component | `ui-engineer` |
| Auth / API / secrets / CSP | `security` (+ `api-engineer` if routes) |
| Incident | `/diagnose` |
| PR check failed | `ci-investigator` |
| Slow page / bundle | `performance-optimizer` |

## Prompt craft

Task prompts: `.cursor/skills/maestro/SKILL.md`. UI Tasks: practical-ui + app-ui. Auth/API/AI/deps: `.cursor/skills/owasp-secure-coding/SKILL.md`.
