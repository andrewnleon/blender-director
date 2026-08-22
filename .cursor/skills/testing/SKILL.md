---
name: testing
description: Vitest unit tests and optional Playwright E2E patterns.
---

# Testing

## Unit (Vitest)

- Location: `src/__tests__/__folder__/` only — see test-folder-structure rule
- Run: `pnpm test`
- Setup: `vitest.setup.ts`, jsdom environment

## E2E (optional)

Add Playwright when product needs browser flows. Keep E2E in `e2e/` separate from Vitest.

## Before merge

`pnpm typecheck` + `pnpm test` for touched areas.
