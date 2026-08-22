---
name: auth-boundaries
description: Auth patterns when Better Auth or similar is wired. Inert until auth is added.
---

# Auth Boundaries

**Status:** Auth not included in starter — enable when you add your provider.

When wired:

- Verify session **inside** every API route and server action
- Do not rely on layout guards alone for mutations
- Map auth errors to 401/403 consistently

See `.env.local.example` for placeholder env vars.
