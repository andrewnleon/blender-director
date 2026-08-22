---
name: folder-structure
description: Repo and src folder structure. Use when adding files, routes, API handlers, or asking where code belongs.
---

# Folder Structure

Single Next.js app. App code under `src/`.

## Repo root

| Path                       | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `src/`                     | Application source                                      |
| `docs/`                    | Architecture, runbooks                                  |
| `.cursor/prompts/` | Prompt templates                                        |
| `public/`                  | Static assets                                           |
| `.cursor/agents/`          | Plan-first workflow (`.cursor/agents/core/workflow.md`) |
| `.cursor/`         | Rules, agents, skills, playbooks                        |
| `.cursor/scripts/`         | Dev/one-off scripts                                     |

## src/ layout

| Folder            | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `src/app/`        | App Router routes, layouts, API                               |
| `src/components/` | Shared UI (`shared/ui/` = shadcn primitives)                  |
| `src/constants/`  | Routes, endpoints, nav labels                                 |
| `src/config/`     | Env-backed config, SEO                                        |
| `src/lib/`        | Auth helpers, validators, cross-cutting (`lib/core/utils.ts`) |
| `src/services/`   | Business logic + data access                                  |
| `src/hooks/`      | React hooks                                                   |
| `src/context/`    | React context providers                                       |
| `src/views/`      | Full-page client views (`*View.tsx`)                          |
| `src/types/`      | Shared types                                                  |
| `src/utils/`      | Pure helpers                                                  |
| `src/styles/`     | `global.css`, CSS modules                                     |
| `src/__tests__/`  | Vitest only — see test-folder-structure rule                  |

## Routes

- **Route groups** (no URL segment): `(marketing)`, `(app)`, `(auth)` — name for your product.
- **API**: `src/app/api/<domain>/.../route.ts`
- **Page-only UI**: route `_components/`

## Where to put new code

| Adding              | Location                                     |
| ------------------- | -------------------------------------------- |
| Page / layout       | `src/app/.../page.tsx`                       |
| Full-page view      | `src/views/*View.tsx`                        |
| API route           | `src/app/api/.../route.ts` + `src/services/` |
| Shared component    | `src/components/<domain>/`                   |
| Page-only component | route `_components/`                         |
| Unit test           | `src/__tests__/__<bucket>/...`               |
| Proxy               | `src/proxy.ts`                               |
