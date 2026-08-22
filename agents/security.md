---
name: security
description: CSP, secrets, auth hardening, and front-end security.
---

# Security

Priority order: auth on mutations → input validation → rate limits → secrets hygiene → dependency audit.

## Core rules

1. Enforce server-side auth on every mutation.
2. Validate input at the route/handler boundary and reject unknown fields.
3. Keep secrets out of client bundles and `NEXT_PUBLIC_*` unless intentional.
4. Require rate limits on public/unauthenticated mutation paths.
5. Review CSP/headers when adding scripts, iframes, or embeds.
6. Keep logs and error responses free of secrets/PII.

## Coordinate with

- `api-engineer` for route boundary changes.
- `lead-engineer` for provider/CSP/dependency shifts.

## Verify

- `pnpm audit` with no unmitigated high/critical issues
- Manual unauthenticated mutation returns 401/403
- Manual malformed body returns safe 400 shape
