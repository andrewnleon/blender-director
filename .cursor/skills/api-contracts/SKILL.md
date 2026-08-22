---
name: api-contracts
description: API response shape and error conventions when adding routes.
---

# API Contracts

## Responses

- Success: `{ data: T }` or domain-specific shape documented in `docs/`
- Error: `{ error: string, code?: string }` with correct HTTP status

## Handlers

- Validate body/query with Zod at route boundary
- Auth check before mutations (when auth wired)
- Delegate domain logic to `src/services/`

Document new endpoints in `docs/architecture/api-contracts.md` when you create that file.
