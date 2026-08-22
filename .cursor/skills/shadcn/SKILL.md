---
name: shadcn
description: Use shadcn/ui primitives and composition patterns for accessible, consistent UI implementation.
---

# shadcn

Use this skill when building or updating components based on shadcn/ui.

## Load with

- `.cursor/skills/app-ui/SKILL.md` for UX logic and product chrome
- `.cursor/prompts/ui-component.md` for implementation task framing

## Rules

1. Prefer existing primitives under `src/components/shared/ui/` before creating new abstractions.
2. Keep variants consistent with existing project tokens and naming.
3. Do not hardcode colors in components; rely on semantic classes/tokens.
4. Maintain keyboard and screen-reader support for all interactive elements.
5. Add only the components needed for the requested scope.

## Commands

- Add a primitive: `pnpm dlx shadcn@latest add <component>`
- Reuse project style from `components.json` (New York)

## Verify

- Tab order and visible focus state
- Label associations (`label` + `id`)
- Disabled/loading behavior on actionable controls
