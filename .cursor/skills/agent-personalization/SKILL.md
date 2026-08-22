---
name: agent-personalization
description: Rename orchestrator command alias and display name. Default is /orcha.
---

# Agent Personalization

Customize the orchestrator command alias and display name across the agent stack.

## Use cases

- Rename `/orcha` to a custom alias (e.g. `/boss`, `/lead`)
- Update display name
- Revert a custom alias back to `/orcha`

## How to rename

```bash
pnpm cpt rename <commandName> [--title "Display Name"]
```

**Examples:**

```bash
pnpm cpt rename plan --title "Plan AI"
pnpm cpt rename orcha --title "Orcha"
```

## What gets updated

1. `.cursor/config/agents.config.json` — command configuration
2. `.cursor/commands/<commandName>.md` — command file (from orcha template)
3. References across prompts and docs via `pnpm cpt sync`

## After renaming

```bash
pnpm cpt sync
```

## Constraints

- Command name: lowercase alphanumeric + hyphens
- Display name: any string (typically Title Case)
- Never create `.cursor/commands/orchestrator.md` — use the configured alias file only
