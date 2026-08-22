# Refactor Prompt

Use this template when a refactor gate triggers and extra structure is helpful.
This template is optional support; Maestro remains the default workflow.

## Goal

**Objective:** What improvement are you targeting?

- ⬜ Performance (reduce load time or unnecessary work)
- ⬜ Readability (simplify logic, improve naming)
- ⬜ Reusability (extract common patterns, DRY)
- ⬜ Architecture (restructure for maintainability)
- ⬜ Technical Debt (modernize patterns, remove workarounds)

**Details:** Why is this refactor needed? Include metrics if performance-related.

## Scope

**Exact files/components affected:**

- `src/path/to/fileA.ts`
- `src/path/to/fileB.ts`

**Out of scope (not touching):**

- Unrelated modules
- Unrelated feature work
- Schema/contract changes unless explicitly required

## Constraints (Must Follow)

✅ **Behavior-preserving by default** (unless explicitly stated otherwise)
✅ **Keep public APIs stable** (props/exports/route params don't change)
✅ **Preserve existing tests** (tests should pass after refactor)
✅ **Type-safe changes only**
✅ **No hidden breaking changes to data structures**

## Deletion Policy

Only delete code if:

- ❌ **Unused:** No imports/references anywhere
- ❌ **Redundant:** Duplicate of existing code
- ❌ **Deprecated:** Explicitly marked for removal
- ✅ **Document why** with proof of non-usage

## Validation Strategy

### Before Refactor

1. Capture current behavior with tests and/or reproducible checks.
2. Confirm what must remain unchanged.

### After Refactor

1. ✅ Type checks pass
2. ✅ Lint/format checks pass (if used by repo)
3. ✅ Relevant tests pass
4. ✅ No behavior regression observed

### Breaking Change Detection

- Did exported names change?
- Did required props/params change?
- Did return types become incompatible?
- Did route contracts change?

If any breaking changes are intentional, document them clearly.

## Lean/Hotfix Rule

For Lean or Hotfix work, keep this minimal:

- Prefer an inline scope note over full template completion.
- Use only the sections needed to keep the refactor safe.

## Quick Checklist

- [ ] Refactor reason is clear
- [ ] Scope is narrow and explicit
- [ ] No intended behavior change
- [ ] Verification evidence captured
- [ ] Any deletions are justified

## References

- [code.rules.md](../rules/code.rules.md)
- [ai.rules.md](../rules/ai.rules.md)
- [test.strategy.md](../testing/test.strategy.md)
