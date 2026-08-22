---
name: app-ui
description: Unified UI skill for UX logic and product chrome: contrast, hierarchy, forms, copy, and interaction clarity. No redesign unless explicit.
---

# App UI

Single source of truth for UI work.

## Non-negotiables

- WCAG 2.1 AA: 4.5:1 body text; 3:1 large text and controls
- Logical reason for each design choice
- Minimize interaction cost and cognitive load
- Do not rely on color alone
- Forms use a single column with visible labels
- Buttons use clear verb+noun labels and adequate touch targets
- Copy uses sentence case and concise, actionable errors

## Before shipping UI

- Contrast passes AA for text and controls
- Primary action is obvious and destructive actions are distinct
- Form labels are visible and errors are specific/actionable
- Async regions have loading states (skeleton or spinner)
- Keyboard focus is visible
- Light and dark modes both work

## Forms

- Single column on mobile
- Required fields marked clearly
- Submit button disabled with loading state during async submit

## Copy

- Sentence case headings
- Front-load errors: what failed and how to fix

## Scope

- Use this skill for UX logic, page structure, form behavior, microcopy, hierarchy, and accessibility expectations.
- Leave component-library choices, primitive reuse, token wiring, and add-component commands to the relevant implementation skill such as `shadcn`.

## No-Drift

Preserve layout and look unless user explicitly asked to redesign.

See `.cursor/prompts/ui-component.md`.
