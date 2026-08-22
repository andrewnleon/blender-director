# Skill Installation Guide

Bundled skills are pre-included; optional marketplace skills require explicit install. Use this guide to decide _which_ skills fit your project.

## Bundled (included by default)

| Skill                            | When                                    | Usage                                                  |
| -------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| `maestro`                        | Every Execution Plan and task prompt    | Multi-lens evaluation (tester, developer, senior lead) |
| `systematic-debugging`           | You encounter bugs or production issues | `/orcha` for root-cause analysis                       |
| `verification-before-completion` | You want pre-release quality gates      | Runs before marking task complete                      |
| `brainstorming`                  | Complex feature scoping (Full mode)     | Orchestrator loads for ambiguous scope                 |
| `caveman`                        | All responses (always on)               | Concise, direct communication style                    |
| `owasp-security`                 | Security-sensitive tasks                | Reviews APIs, auth, data, integrations, and config     |

**Bundled skills are synced automatically with `pnpm sync-agents`. Maestro and caveman are always active.**

---

## Optional Marketplace Skills

### `shadcn` — React Component Composition

**Install if:**

- Building UI in React
- Want copy-paste component patterns (Button, Dialog, Card, etc.)
- Using Tailwind CSS

**Skip if:**

- Not doing React UI work
- Using different component library (Material UI, Ant, etc.)
- Prefer custom CSS

**Usage:**

```bash
node .cursor/scripts/_client/build-manage-skills.mjs add shadcn --cwd .
```

**Then:** ui-engineer loads `.cursor/skills/shadcn/SKILL.md` for component delegation tasks.

**Example:** `/orcha add a notification banner with shadcn Dialog + Toast`

---

### `tailwind` — Utility-First Styling (Tailwind v4)

**Install if:**

- Using Tailwind CSS v4+ in your project
- Want best-practice utility patterns
- Building responsive layouts

**Skip if:**

- Using Sass, CSS Modules, or styled-components
- Tailwind already configured in your project and you're comfortable with it
- Using CSS-in-JS framework

**Usage:**

```bash
node .cursor/scripts/_client/build-manage-skills.mjs add tailwind --cwd .
```

**Then:** ui-engineer references `.cursor/skills/tailwind/SKILL.md` for responsive design, dark mode, accessibility guidance.

**Example:** `/orcha create a responsive hero section with Tailwind`

---

### `next-best-practices` — Next.js App Router Conventions

**Install if:**

- Using Next.js 13+ (App Router)
- Want authoritative Vercel patterns for RSC, server actions, layout nesting
- Building full-stack features (API routes + client)

**Skip if:**

- Using Pages Router (Next.js 12 or older)
- Using different framework (Remix, SvelteKit, Astro, etc.)
- Static/frontend-only project

**Usage:**

```bash
node .cursor/scripts/_client/build-manage-skills.mjs add next-best-practices --cwd .
```

**Then:** api-engineer, data-engineer load `.cursor/skills/next-best-practices/SKILL.md` for server action patterns, middleware, data fetching.

**Example:** `/orcha add a server action that fetches user profile with caching`

---

### `global-agent-guardrails` - Cross-Agent Dangerous Command Guardrails (Included by Default)

**Included automatically:**

- The skill is bundled into every client project.
- Client setup installs `.git/hooks/dangerous-patterns.txt` when `.git/hooks/` exists.
- Existing client-managed denylist files are preserved.

**Skip if:**

- You already enforce equivalent global guardrails outside this repo.

**Hook acknowledgment:**

- Upstream reference: https://github.com/davidondrej/skills/blob/main/hooks/dangerous-patterns.txt
- Vendored copy in this repo: `.cursor/scripts/hooks/dangerous-patterns.txt`
- Client setup copies it into `.git/hooks/dangerous-patterns.txt` for local visibility.
- This package does not auto-wire user-global agent configs under `~/.codex`, `~/.cursor`, `~/.claude`, etc.

**Then:** use guardrail policy as reference in orchestrator/security reviews and tune denylist patterns intentionally to avoid over-blocking.

---

## Decision Tree

```text
Are you building UI?
├─ YES, React?
│  ├─ YES → Install shadcn + tailwind
│  └─ NO → Skip (use your framework's docs)
└─ NO → Backend/API only? → Skip UI skills

Are you using Tailwind?
├─ YES, v4? → Install tailwind
└─ NO / CSS Modules / styled-components → Skip

Are you using Next.js 13+ (App Router)?
├─ YES → Install next-best-practices
└─ NO / Pages Router / different framework → Skip

Need cross-agent shell safety policy guidance?
├─ YES → Install global-agent-guardrails
└─ NO → Skip
```

---

## Installation Workflow

### 1. After `pnpm copilot:init`

```bash
node .cursor/scripts/_client/build-manage-skills.mjs list --cwd .
node .cursor/scripts/_client/build-manage-skills.mjs add shadcn --cwd .        # or any desired skill
pnpm sync-agents              # redeploy to .cursor/
```

Behind the scenes, skill lifecycle is handled by the script-backed manager (`copilot-agent-skills-manage`) so orchestrator workflows can trigger deterministic manifest and filesystem updates.

### 2. Verify Installation

```bash
# Check .cursor/skills/ for new skill directories
ls .cursor/skills/

# Orchestrator will auto-load skills when delegating to specialists
```

### 3. Use in Workflows

- **UI Tasks:** `/orcha [ui task]` → Orchestrator delegates to ui-engineer
- **ui-engineer** automatically loads relevant skills (shadcn, tailwind, app-ui)
- No manual skill invocation needed; delegation triggers skill loading

---

## FAQ

**Q: Do I need all optional skills?**  
A: No. Install only skills matching your tech stack. Bundled skills handle 80% of workflows.

**Q: Can I install skills later?**  
A: Yes. Anytime: `node .cursor/scripts/_client/build-manage-skills.mjs add [name] --cwd . && pnpm sync-agents`

**Q: What if I install a skill and don't use it?**  
A: No cost. Unused skills are loaded only when you delegate relevant tasks to specialists.

**Q: Can I uninstall a skill?**  
A: Yes. Use `node .cursor/scripts/_client/build-manage-skills.mjs remove [name] --cwd .`, then run `pnpm sync-agents` and validate with `pnpm sync-agents --dry-run`.

**Q: What's the difference between "bundled" and "optional"?**  
A: **Bundled** skills sync with every `pnpm sync-agents` automatically. **Optional** require explicit install via the skill manager script and are customizable per project.
