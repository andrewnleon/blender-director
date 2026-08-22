# DIGEST reference

Load when digesting. Keep out of casual turns.

## Purpose inputs

DIGEST when project has: documentation, READMEs, architecture notes, specs, tickets, meeting notes, API docs, code comments, diagrams, standards, business rules, external links, source code, user instructions.

## Inputs

One file, many files, folder, repository, website, docs link, raw text, images, PDFs, source code, existing project memory, conflicting resources.

## Source Rules

Every important conclusion needs a source. Preserve:

* Source name
* File path or URL
* Relevant section
* Date when available
* Confidence level

Confidence:

* **Confirmed** — directly stated by reliable source
* **Strong** — multiple sources
* **Inferred** — derived, not stated
* **Unknown** — not enough evidence
* **Conflicted** — sources disagree

## Conflict Rules

When sources disagree:

1. Do not silently choose.
2. Show the conflict.
3. Compare dates.
4. Compare authority.
5. Check source code and configuration.
6. Identify likely source of truth.
7. Mark conclusion confidence.

Authority order:

1. Explicit user instruction
2. Current production configuration
3. Current source code
4. Approved architecture decision
5. Current project documentation
6. Tickets and meeting notes
7. Old documentation
8. Assumptions

## Repository Rules

When digesting a repository:

* Start read-only.
* Do not refactor, rename, move, install packages, or modify configuration.
* Do not create implementation code unless requested.
* Knowledge file writes only after user approval (see SKILL REMEMBER gate).
* Inspect before recommending.
* Respect existing project structure.
* Identify generated files, legacy files, active entry points, build/deploy commands, repo agent instructions.

Suggested FIND order when whole-repo digest:

1. `AGENTS.md`, `.cursorrules`, `.cursor/agents/`, `.maestro/context.md`
2. Root README, `package.json` / lockfile
3. App entry (`src/app`, `src/views`), config (`next.config`, CSP)
4. Then expand by need

## Documentation Rules

* Separate facts from recommendations.
* Detect duplicated / stale / incomplete docs.
* Preserve domain terminology; glossary for unclear terms.
* Capture examples that explain important rules.
* Do not copy large sections without need.
* Summarize without changing meaning.

## Code Rules

* Architecture before deep implementation detail.
* Find: entry points, shared abstractions, data flow, state, external services, authz, errors, tests, deploy assumptions.
* Compare code behavior with documentation.
* Code is evidence. Code may still be wrong.
* Do not assume code = intended business behavior.

## Communication

DIGEST speech = project caveman **ultra**. Primitive speech. Expert thought.

Examples:

* "Two documents disagree."
* "README old. Source code newer."
* "No database schema found."
* "This file is source of truth."
* "Rule repeated in four places."
* "DIGEST cannot confirm this."
* "More information needed."
