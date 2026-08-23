# Maestro Workflow Context — 3d Building

**Primary work:** Blender 3D (Command Center construction scene) via Blender MCP.

- Working file: `projects/workshop/workshop.blend` (master yard)
- Command Center animation: `projects/command-center/command-center.blend`
- Canonical source: `projects/workshop/source.blend`
- Construction animation: `animate_construction.py`
- 3D skills: `blender-director` + 94-pack under `.cursor/skills/` + project skill `3d-building-blender`

**Secondary stack (web viewer):** `stage/` — Next.js 16 App Router, React, TypeScript, Tailwind v4, Three.js / R3F.

**Yard vs library (construction UX):** OpenClaw yard (`openclaw-yard.tsx`) owns placement + stream-driven scrub via `constructDriveModeForCatalog`. Asset library (`asset-library.tsx`) uses `staticPreview` + `libraryConstructPlayback` only — do not pass yard stream maps or duplicate library layout rules into the yard.

Auth and database are **project choices** — wire when needed; skills `auth-boundaries` and `drizzle-neon` describe patterns.

## Workflow Architecture

**Entry:** `/orcha` → `.cursor/commands/orcha.md` → agent `.cursor/agents/orchestrator.md` · `agents/core/workflow.md`

| Mode | When | Flow |
| ---- | ---- | ---- |
| **Lean** | Single file, copy, small bug | TASK_ROUTER → short plan → implement → verify |
| **Full** | Feature, migration, multi-route | Execution Plan → approval → specialists |
| **Hotfix** | Crash, auth/data leak | `/diagnose` → minimal fix → verify |

## CLI runtime

- Command: `/orcha`
- Caveman: **ultra**
- Stack: nextjs-app-router

**Orchestrator prompting stack:**

| Skill | When | Skip |
| ----- | ---- | ---- |
| `brainstorming` | Full + creative/ambiguous scope | Lean, Hotfix |
| `maestro` | Every Execution Plan + Task prompt | Never |
| `caveman` | All user replies (forced default **ultra**) | — |
| `digest` | Unknown / new project context before plan/build | Lean copy fixes with known context |
| `practical-ui` | Every UI Task to ui-engineer | Non-UI |
| `app-ui` | Product chrome after practical-ui | — |
| `ai-sdk` | AI routes / streaming (optional) | Non-AI |

Keep subagent prompts lean — link paths, do not paste whole files.

## Quality gates

Before claiming done: `pnpm typecheck`, `pnpm test`, targeted manual check. See `.cursor/playbooks/core/QUALITY_GATES.md`.
