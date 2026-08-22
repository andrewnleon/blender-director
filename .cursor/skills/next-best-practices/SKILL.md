---
name: next-best-practices
description: Next.js App Router conventions. Upstream knowledge skill retired — use bundled Next.js docs plus vercel-react-best-practices.
---

# Next.js best practices

Vercel retired the standalone `next-best-practices` marketplace skill. Framework knowledge now ships with Next.js (16.3+) as bundled docs, not a separate skill.

**Do not** run `npx skills add vercel/nextjs-skills` — that repo has no `SKILL.md`.

## Load in this order

1. Consumer project `AGENTS.md` / `CLAUDE.md` (written by `next dev` on Next.js 16.3+)
2. Version-matched docs: `node_modules/next/dist/docs/` (or `.next-docs/` after `npx @next/codemod@canary agents-md`)
3. `.cursor/skills/vercel-react-best-practices/SKILL.md` — performance and composition rules
4. `.cursor/skills/folder-structure/SKILL.md` and `.cursor/skills/code-structure/SKILL.md` — this stack’s file placement

## When this skill applies

- App Router routes, layouts, server actions, `src/app/api/**/route.ts`
- RSC vs client boundaries
- Caching, prefetch, proxy (`src/proxy.ts`, not `middleware.ts`)

## Workflow skills (optional, not bundled)

Install from `vercel/next.js` only when the consumer needs a workflow, not reference docs:

```bash
npx skills add vercel/next.js --skill next-dev-loop
npx skills add vercel/next.js --skill next-cache-components-adoption
```

## Verify

- Follow Next.js docs for the installed `next` version, not training-data defaults
- Pair api-engineer + security on mutations
- Quality gates: `pnpm typecheck`, `pnpm test`
