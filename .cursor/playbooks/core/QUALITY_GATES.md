# Quality Gates

Before claiming done:

1. `pnpm typecheck` — pass
2. `pnpm test` — pass (or explain skipped scope)
3. `node .cursor/cli/index.mjs validate prompts` — pass for prompt/governance changes
4. Manual smoke of changed UI/routes
5. Load `verification-before-completion` skill for evidence-based completion
6. For agent-stack changes, run universality grading in `.cursor/playbooks/core/UNIVERSALITY_GRADE.md` and report score
7. For security-sensitive review work, apply `.cursor/playbooks/core/SECURITY_REVIEW_CHECKLIST.md`

Hotfix: at minimum typecheck + targeted test.
