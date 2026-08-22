# Stack Profiles

Purpose: remove ambiguity about framework-specific paths and conventions.

Primary framework for this stack: Next.js App Router (`nextjs-app-router`).

## Selection rule (mandatory)

Before implementation, Orchestrator MUST select exactly one stack profile.

`.maestro/context.md` is intentionally allowed to stay empty for new projects.
If it is empty, Orchestrator MUST run a short context intake with the user before implementation.

Selection source, in order:

1. explicit `stack_profile` in `.maestro/context.md`
2. explicit user instruction
3. repository evidence (framework files and folder layout), confirmed in plan output
4. if still unclear: ask user, then choose `generic`

If repository evidence clearly indicates Next.js App Router, choose `nextjs-app-router`.

Never use an unconfirmed default profile for ambiguous repositories.
If the profile is inferred (not explicit), state the assumption before editing.

## Context intake (when `.maestro/context.md` is empty)

Collect these fields before planning:

1. `stack_profile` (or enough details to infer one)
2. runtime/framework (`nextjs`, `node`, `react`, mixed, other)
3. package manager (`pnpm`, `npm`, `yarn`, `bun`)
4. deployment target (optional but recommended)

If the user does not provide enough detail, continue with `generic` and call out limitations.

## Allowed profiles

| Profile id          | Intended use                                     | API conventions                              | UI conventions                                        |
| ------------------- | ------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------- |
| `nextjs-app-router` | Next.js App Router projects                      | `src/app/api/**/route.ts`, `actions.ts`      | route-scoped UI in `src/app/**/_components/`          |
| `node-service`      | Node backend without Next.js routing             | service/router per repo convention           | not applicable                                        |
| `react-spa`         | Client-side React app without Next.js App Router | not applicable                               | feature/component structure per repo convention       |
| `aem`               | 
| `generic`           | Unknown or mixed stack                           | inspect repo and follow existing conventions | inspect repo and follow existing conventions          |

## Behavior by profile

- `nextjs-app-router`: follow current project defaults in this stack.
- `node-service`: avoid Next.js route/action assumptions.
- `react-spa`: avoid backend route assumptions unless server workspace exists.
- `aem`: avoid SPA/Node assumptions; follow AEM component, Sling, and OSGi conventions.
- `generic`: prefer discovery first, then use existing project conventions.

## Required reporting

Execution Plan and Lean plan MUST include:

1. selected `stack_profile`
2. whether profile was explicit or inferred
3. one-line rationale
