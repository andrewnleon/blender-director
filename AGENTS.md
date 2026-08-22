# Cursor Agent Starter

**Source repo:** [@andrewnleon/cursor-agent-starter](https://github.com/andrewnleon/cursor-agent-starter)

Orchestrator workflow, specialist agents, project skills, and rules — **no app code**. Sync into any repo (Next.js, CarFlixer, etc.).

## Workflow (read first)

**Main entry:** **/orcha** → `.cursor/commands/orcha.md` → agent `.cursor/agents/orchestrator.md`

| Mode | When | Invoke |
|------|------|--------|
| **Lean** (default) | One file, copy, small bug | `/orcha` → implement or one specialist |
| **Full** | Feature, migration, multi-route | `/orcha` Execution Plan · `/plan` |
| **Hotfix** | Crash, auth/data leak | `/diagnose` |
| **Context** | Unknown / thin repo | `/digest` |
| **Fit check** | Requirements vs architecture | `/evaluate` |
| **Review** | Anti-patterns, performance | `/reflect` |

Routing: `.cursor/playbooks/core/TASK_ROUTER.md` · Stack profiles: `.cursor/playbooks/core/STACK_PROFILES.md` · Specialists: `.cursor/agents/README.md`

## Communication (always on)

All agents use **caveman** — `.cursor/rules/caveman.mdc`, `.cursor/skills/caveman/SKILL.md`. Default **ultra**. Off: `stop caveman` / `normal mode`.

## Agent quick map

| Need | Look here |
|------|-----------|
| Task tool routing | `.cursor/agents/SUBAGENT_MAP.md` |
| File placement | `.cursor/skills/folder-structure/SKILL.md` |
| API vs service vs lib | `.cursor/skills/code-structure/SKILL.md` |
| UI (UX logic) | `/practical` → `.cursor/skills/practical-ui/SKILL.md` |
| UI (product chrome) | `.cursor/skills/app-ui/SKILL.md` |
| Tests | `.cursor/skills/testing/SKILL.md` |
| Update in consumer projects | `pnpm cpt sync` (see README) |
| Inspect consumer payload | `pnpm cpt export` → committed `export/` (see README) |

## Skills policy

**Canonical skills:** `.cursor/skills/` (source of truth). Marketplace refresh: `skills-manifest.json`. `.agents/` is a gitignored `npx skills add` artifact — never the source of truth.

**Bundled** (every `pnpm cpt sync`): all `skills-manifest.json` marketplace skills (committed under `.cursor/skills/`). **Optional npm peers** (`optionalPeers`): `typescript`, `tailwindcss` — not required to install this stack.

| Skill | Role |
|-------|------|
| `systematic-debugging` | Root-cause before patch |
| `verification-before-completion` | Evidence before “done” |
| `brainstorming` | Full + ambiguous scope |
| `requesting-code-review` | Review context + evidence |
| `writing-skills` | Author/edit agent skills |
| `owasp-security` | OWASP Top 10 reviews (marketplace) |
| `owasp-secure-coding` | Next.js OWASP checklist (local) |
| `global-agent-guardrails` | Shell denylist + `scripts/hooks/dangerous-patterns.txt` |
| `shadcn` | shadcn/ui composition |
| `tailwind` | Tailwind v4 docs (`lombiq/tailwind-agent-skills`). **npm `tailwindcss` optional** |
| `next-best-practices` | Vendored pointer: Next bundled docs + `vercel-react-best-practices` (upstream skill retired) |
| `vercel-react-best-practices` | Vercel React/Next performance rules |

| Task | Prefer | On demand (`pnpm cpt manage-skills add`) |
|------|--------|-------------------------------|
| Communication | `caveman` | — |
| Planning | `/orcha`, `/plan`, `maestro` | `brainstorming` already bundled |
| Context | `digest` (`/digest`) | — |
| Security | `owasp-security` + `owasp-secure-coding` | — |
| UI | `practical-ui` → `app-ui` → `shadcn` | `ui-ux-pro-max` (redesign only) |
| Styling | `tailwind` | — |
| Next.js | `next-best-practices` + `vercel-react-best-practices` | — |
| Debug | `systematic-debugging` | — |
| Review | `requesting-code-review` | `check-pr` |
| AI routes | — | `ai-sdk` |
| Done | `verification-before-completion` | — |

## TypeScript

No `as any`, `as unknown`, or double assertions — `.cursor/rules/type-safety.mdc`.

## Consumer projects

Install flow (**0.3.0+**): GitHub Packages auth → one-command install+init → verify → optional skills.

### 1. GitHub Packages auth (pnpm)

Not public npm. See [README.md](./README.md#1-github-packages-auth-pnpm) and [.npmrc.example](./.npmrc.example). PAT needs `read:packages`. SSH keys do not authenticate `pnpm add`.

### 2. Install + init

```bash
pnpm add -D @andrewnleon/cursor-agent-starter && pnpm exec cpt init
```

Expect Vercel triangle + `✓ Init complete`. Do **not** run bare `cpt`. Skip prompts: append `--yes` to `cpt init`. Init writes `.cursor/config/agents.config.json`, injects `cpt` / `sync-agents` / `skills:add` / `rename` if missing, then syncs.

### 3. Sync later

```bash
pnpm cpt sync
```

`pnpm sync-agents` still works. Default sync bundles core skills under `.cursor/skills/`; does **not** overwrite `src/`.

Optional:

```bash
pnpm cpt sync --with-skills
pnpm cpt manage-skills add ai-sdk
```

### 4. Verify

Open consumer project root in Cursor. Confirm `.cursor/agents/`, `.cursor/rules/`, `.cursor/skills/systematic-debugging/`. Caveman default **ultra** — `stop caveman` for normal prose.

## 3D / Blender (this project)

Installed from [arjun988/blender-skills](https://github.com/arjun988/blender-skills) into `.cursor/skills/` (94 skills). Entry skill: **`blender-director`**. Project overlay: **`3d-building-blender`**.

Blender MCP is configured in `.cursor/mcp.json` (port `9876`). Keep Blender open with **BlenderMCP → Connect**. Drive the scene with MCP — do not narrate UI.

| Need | Skill |
|------|--------|
| Plan any 3D task | `blender-director` |
| This repo’s blend + animation | `3d-building-blender` |
| Building / props | `hard-surface`, `prop-artist`, `archviz` |
| Animation | `animation` |
| Export to `stage/` | `export-pipeline` |
