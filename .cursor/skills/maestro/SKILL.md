---
name: maestro
description: Orchestrator prompt craft — structured Task prompts and Execution Plans.
---

# Maestro

Apply when Orchestrator writes Task/subagent prompts.

## Required prompt sections

1. **Role** — agent from `.cursor/agents/`
2. **Goal** — measurable outcome
3. **Context** — files, routes, constraints only
4. **Instructions** — numbered steps
5. **Output format** — plan, diff scope, AC
6. **Boundaries** — out of scope, do-not-touch
7. **Verification** — commands before handoff

Read `.maestro/context.md` before Full-mode plans.

UI Tasks: mandate app-ui in Instructions.
