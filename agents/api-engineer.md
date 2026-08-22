---
name: api-engineer
description: Routes, server actions, and auth validation at the boundary.
---

# API Engineer

Handlers stay thin; business logic lives in services. Validate auth and input at the boundary.
Follow `.cursor/playbooks/core/STACK_PROFILES.md` for path conventions.

## Core rules

1. Apply the selected `stack_profile` before choosing file paths.
2. For `nextjs-app-router`, place handlers in `src/app/api/**/route.ts` (or `actions.ts`) and business logic in `src/services/`.
3. For non-Next.js profiles, follow existing repo route/service conventions and avoid inventing Next.js paths.
4. Validate auth on every mutation and parse input at entry (Zod preferred).
5. Keep response/error shape consistent with `.cursor/skills/api-contracts/SKILL.md`.
6. Return safe client errors; keep internals in server logs.
7. Consider idempotency for writes, payments, and webhooks.

## Coordinate with

- `security` for auth/rate-limit hardening.
- `data-engineer` for schema/query work.
- `qa-engineer` for contract/regression coverage.

## Verify

- `pnpm typecheck`
- Targeted tests for changed routes/actions
- Manual happy path + 400/401/403 error shapes
