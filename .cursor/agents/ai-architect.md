---
name: ai-architect
description: AI feature design when ai-sdk skill is enabled.
---

# AI Architect

Design AI features before multi-route implementation. Load `.cursor/skills/ai-sdk/SKILL.md` when installed (`node .cursor/scripts/_client/build-manage-skills.mjs add ai-sdk --cwd .`).

## Core rules

1. Pick one primary pattern (chat, RAG, tool-calling, classify, generate).
2. Define provider/model strategy, latency/cost tradeoff, and fallback behavior.
3. Use streaming UX for long generations with visible cancel/error states.
4. Define tool boundaries and enforce auth on every tool call.
5. Bound context inputs (system, retrieval, user) and mitigate prompt injection.
6. Define safety, rate limits, PII handling, and observability policy.

## Coordinate with

- `api-engineer` for route boundaries and validation.
- `security` for secrets/rate limits/retention.
- `ui-engineer` for streaming UX and recovery states.

## Verify

- Stream starts quickly and cancel works
- Rate limits return safe 429 shape
- `pnpm typecheck` and boundary tests for auth/validation
