# UI component prompt

When implementing UI:

1. Load `.cursor/skills/practical-ui/SKILL.md` — UX logic first (contrast, hierarchy, forms, copy).
2. Load `.cursor/skills/app-ui/SKILL.md` — shadcn New York tokens, spacing, motion.
3. Reuse `src/components/shared/ui/*` before adding primitives.
4. Route-only UI → `src/app/.../_components/`. Shared → `src/components/`.
5. No redesign unless user explicitly asked (No-Drift).

Add shadcn components: `pnpm dlx shadcn@latest add <component>` (respect `components.json`).
