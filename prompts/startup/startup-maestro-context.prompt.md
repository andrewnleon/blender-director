# Maestro Context Setup Prompt

Use this prompt in Copilot Chat after installing the agent stack.

## Goal

Create or update `.maestro/context.md` for the current repository so Orchestrator has the project context it needs on the first task.

## Instructions for Copilot

- Inspect the current repository structure and infer the stack from evidence.
- Write `.maestro/context.md` with concise, concrete project context.
- Include these fields when known:
  - `stack_profile`
  - runtime/framework
  - package manager
  - deployment target
  - 
## Suggested output shape

```markdown
# Project Context

## Stack Profile

- stack_profile: `nextjs-app-router`
- runtime/framework: `nextjs` + `react` + `typescript`
- package manager: `pnpm`
- deployment target: `azure static web app`

## Project Metadata

- application: `<app name>`
- repository: `<repo name>`

## API Structure (if applicable)

- **REST base path:** `/api/v1`
- **Service layer:** `src/services/` — business logic, external integrations
- **Data models:** `src/schema/` — Zod types, validation rules
- **Authentication:** `src/middleware/auth.ts` — bearer token, JWT validation
```

## Usage

Open Copilot Chat and paste this prompt when you need to populate `.maestro/context.md`.
