# Plan [task…]

Full planning only — **no code** until user approves.

Follow `.cursor/agents/core/workflow.md` Phase 2. Output Orchestrator Execution Plan.

Load: maestro, caveman, optional brainstorming for ambiguous scope.

## Required output (must include all sections)

1. Feature Summary
2. Stack Profile
3. Domain Modules
4. Specialist Assignments
5. Order of Implementation
6. Risks
7. Acceptance Criteria

## Stack Profile section contract

The Stack Profile section MUST include all fields:

- `stack_profile`: one of `nextjs-app-router`, `node-service`, `react-spa`, `aem`, `generic`
- `profile_source`: `context`, `user`, or `inferred`
- `rationale`: one sentence
- `context_intake`: `completed` or `not-needed`

If `.maestro/context.md` is empty, run context intake before finalizing the plan.
