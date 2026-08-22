---
name: code-structure
description: API routes vs src/services vs src/lib. Use when extracting shared logic or placing new backend code.
---

# Code Structure

**Three layers:**

| Layer | Location | Owns |
|-------|----------|------|
| Edge | `src/app/api/**/route.ts` | HTTP, auth check, Zod at boundary, status codes |
| Domain | `src/services/` | Business rules, DB access, DTOs |
| Providers | `src/lib/` | SDK wrappers, validators, shared utilities |

**Rule:** Repeated logic across 2+ routes → extract to service or lib. One-off route logic can stay in handler.

**Don't:** Large transactional DB blocks in route files. Duplicate SDK setup in every route.

Flow: **Database → Services → API / RSC → Client**
