# Digest Playbook

Covers two intake patterns: **API Catalog digestion** and **General documentation digestion**. Both use `.cursor/prompts/digest.prompt.md` and route through `/orcha digest`.

---

## Pattern 1: General Documentation Digest

Use when you have design docs, onboarding guides, reference material, specs, or any unstructured documentation that needs classification and routing before implementation.

### How to Use

```
/orcha digest

[Paste documentation]
```

Orchestrator will output:

- **Intent**: one-sentence classification
- **Scope**: Lean / Full / Hotfix
- **Risk & Confidence**: gaps identified
- **Owner**: matched specialist
- **Next Step**: `/orcha`, `/plan`, or `/diagnose`

### Routing

| Signal in docs               | Primary owner   |
| ---------------------------- | --------------- |
| Security/auth/session/token  | `security`      |
| Data schema / migrations     | `data-engineer` |
| API routes / contracts       | `api-engineer`  |
| UI / UX / components         | `ui-engineer`   |
| Test gaps / validation       | `qa-engineer`   |
| Architecture / cross-cutting | `lead-engineer` |

---

## Pattern 2: API Catalog Digest

Use when you provide structured API endpoint documentation (multiple services, base URLs, component-to-endpoint mappings). The digest will:

1. **Recognize** the API catalog pattern automatically
2. **Classify** work scope, ownership, and risk gaps
3. **Organize** endpoints by domain/feature
4. **Identify** missing specs (auth, error handling, tests, rate limits)
5. **Route** to the right specialists with full context

## How to Use (API Catalog)

### Step 1: Provide API Documentation

Paste your structured API catalog to the orchestrator. Include:

- Base URLs (with environment keys)
- Endpoint tables (organized by feature/domain)
- Component-to-endpoint mappings
- Frontend use cases
- Production URL examples

**Example:**

```
## Base URL keys
- serviceRootUrl → production: https://svcgateway.
- expServiceUrl → production: https://svcgateway.

## Planner endpoints
| Endpoint | Frontend function | ... |
| `/my/planner/details` | Fetch program details | ... |
```

### Step 2: Request Digest

```
/orcha digest

[Paste API catalog]
```

### Step 3: Review Classification

Orchestrator will output:

- **Intent**: API contract documentation for [project]
- **Scope**: Full (requires orchestration)
- **Risk Gaps**: Missing auth specs, error handling, tests, rate limits
- **Owner**: api-engineer (primary) + qa-engineer, security (secondary)
- **Next Step**: Run `/plan`

### Step 4: Orchestrate

```
/orcha plan

[Review suggested Execution Plan]
```

This assigns tasks to:

- **api-engineer**: Contract design, auth policy, integration architecture
- **qa-engineer**: Integration testing strategy, coverage assessment
- **security**: Data classification, auth review, BOLA/SSRF risk assessment

---

## What Gets Stored

After digestion, the classified API catalog is saved to `.maestro/[project]-apis.md` and includes:

- ✅ Service catalog breakdown (domains, base URLs, component scope)
- ✅ Endpoint organization (by domain)
- ✅ Component-to-endpoint mappings
- ❌ Missing: Auth policy per endpoint
- ❌ Missing: Error handling spec
- ❌ Missing: Rate limit policy
- ❌ Missing: Response schema / Zod validation
- ❌ Missing: Integration test coverage

---

## Example: Student Portal

**Input**: Your API endpoint catalog with 65+ endpoints across 8 domains

**Digest Output** (automatically):

```markdown
## Service Catalog

- DU Portal: serviceRootUrl → duportal-ea/v1
- Classroom: expServiceClassroomUri → classroom-ea
- Values: expServiceUrl → values-ea

## Domains

- Planner (5 endpoints)
- Graduation (3 endpoints)
- Finances (7 endpoints)
- ... [organized by feature]

## Risk Gaps

- ❌ Authorization policy undefined
- ❌ Error response schema undocumented
- ❌ Rate limits not specified
- ❌ Integration tests missing

## Delegation

- Primary: api-engineer
- Secondary: qa-engineer, security

## Next: Run /plan
```

---

## Who Owns What

| Role              | Responsibility                                                                  |
| ----------------- | ------------------------------------------------------------------------------- |
| **api-engineer**  | Contract design, auth policy, integration architecture, service orchestration   |
| **qa-engineer**   | Integration test strategy, endpoint coverage, error case validation             |
| **security**      | Auth boundary review, data classification, BOLA/SSRF/rate-limit risk assessment |
| **lead-engineer** | Cross-service orchestration, dependency strategy, deployment architecture       |

---

## Key Differences (Before vs. After)

### Before (Confused)

```
User: [Provides 65-endpoint API catalog]
Orchestrator: ❌ Unclear scope, routing ambiguous, no structure
→ Did not know where to start
```

### After (Organized)

```
User: [Provides 65-endpoint API catalog]
Orchestrator: ✅ Detects API Catalog pattern
→ Runs digest.prompt.md
→ Outputs: Domain breakdown, risk gaps, ownership
→ Stores: .maestro/student-portal-apis.md
→ Routes: /plan to orchestrate api-engineer + qa-engineer + security
→ Ready for implementation with clear ownership
```

---

## Related Resources

### Orchestrator Workflow

- [Orchestrator command](../../commands/orcha.md) — Main entry point
- [Digest command](../../commands/digest.md) — Intake + routing
- [TASK_ROUTER](../core/TASK_ROUTER.md) — Specialist delegation

### Documentation

- [WORKFLOWS_GUIDE.md](../../../WORKFLOWS_GUIDE.md) — Team guide for all workflows
- [AGENTS.md](../../../AGENTS.md) — Agent quick map and skills policy
- [Build walkthrough](../../../docs/build-walkthrough/) — Source repo docs
- [Client walkthrough](../../../docs/client-walkthrough/) — Client project docs

---

## Files Changed

- `.cursor/commands/digest.md` — Added API Catalog routing rule #1
- `.cursor/commands/orcha.md` — Added API Catalog Digestion section
- `.cursor/prompts/digest.prompt.md` — Intake prompt with CRAFT framing and API catalog section
- `.cursor/playbooks/digest/README.md` — This playbook
- `README.md` — Linked to this playbook (see Discovery section)

---

## Natural Workflow: Three Phases

### Phase 0: Catalog Validation ✅ (you do this)

1. **Cross-check against live env vars** — confirm all base URLs and fill unconfirmed URL entries
2. **Add auth/error/owner columns** — document authorization policy, error handling, and owner per endpoint
3. **Review coverage gaps** — create checklist of missing specs (rate limits, deprecated endpoints, etc.)
4. **Store enriched catalog** in `.maestro/[project]-apis.md` with status columns

### Phase 1: Digest & Plan 🎯 (orchestrator does this)

1. Run `/orcha digest` + paste your catalog
2. Orchestrator generates structured classification with risk gaps
3. Review digest output
4. Run `/plan` to orchestrate implementation across specialists

### Phase 2: Implementation 🔨 (specialists do this)

- **api-engineer**: Contract design, auth policy, integration architecture
- **qa-engineer**: Integration testing strategy, coverage assessment
- **security**: Auth boundary review, data classification, risk validation

---

## Key Files & Links

- **Main orchestrator command**: `.cursor/commands/orcha.md`
- **Digest command**: `.cursor/commands/digest.md`
- **Digest prompt (with CRAFT framing)**: `.cursor/prompts/digest.prompt.md`
- **This guide**: `.cursor/playbooks/digest/README.md`

---

## Next Steps

1. **Phase 0**: Enrich your API catalog with auth/error/owner columns and cross-check URLs
2. **Phase 1**: Run `/orcha digest` + paste your enriched catalog
3. **Phase 2**: Run `/plan` to orchestrate specialists
4. Each specialist gets their assignment with full context
