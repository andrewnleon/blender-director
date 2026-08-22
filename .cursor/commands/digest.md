# Digest [task...]

Structured intake only. Do not implement code changes in this step.

Use this command to classify user input and route to the correct workflow.

## Required output

1. Intent
2. Scope (Lean, Full, or Hotfix)
3. Risk score and confidence
4. Primary owner and optional secondary reviewer
5. Required evidence before closure
6. Recommended next command (`/orcha`, `/plan`, `/diagnose`, or direct Lean action)

## Routing rules

1. **API catalog / service integration documentation** → `api-engineer` (primary) + `/plan`
   - Signal: multiple base URLs, endpoint tables, component-to-service mappings
   - Use: `.cursor/prompts/digest.prompt.md`
   - Store result in: `.maestro/external-apis.md`
2. **General documentation** (design docs, onboarding guides, reference material, specs) → classify intent and route to matching specialist
   - Use: `.cursor/prompts/digest.prompt.md`
3. Security/auth/session/token risk -> `security`
4. Data schema/integrations/migrations -> `data-engineer`
5. API routes/server actions/contracts -> `api-engineer`
6. UI/components/UX -> `ui-engineer`
7. Test evidence or validation gaps -> `qa-engineer`
8. Cross-cutting architecture/dependencies -> `lead-engineer`

## Prompt quality gate (CRAFT)

If role, assignment, or output format is missing and confidence is low, request missing fields before delegation.

## API Catalog Digest Quick Link

When consuming multi-service API endpoint documentation:

1. **Enrich your catalog**: Add auth/error/owner columns and cross-check base URLs against env vars
2. **Run digest**: `/orcha digest` + paste your API catalog
3. **Follow up**: Run `/plan` to orchestrate api-engineer + qa-engineer + security
4. **Learn more**: [Digest Playbook](../playbooks/digest/README.md)
