# Agent Folder Universality Grade

Purpose: score how reusable this agent stack is across different projects without major rewrites.

Use this rubric before release and after major workflow changes.

## Scoring model

- Grade each dimension from 0 to 5.
- Multiply by weight.
- Sum weighted points.
- Convert to percentage out of 100.

Formula:

`universality_score = (sum(score_i * weight_i) / (5 * sum(weights))) * 100`

## Dimensions and weights

| Dimension             | Weight | What to check                                                    |
| --------------------- | -----: | ---------------------------------------------------------------- |
| Repo agnosticism      |     20 | Minimal hardcoded product paths, names, and assumptions          |
| Stack portability     |     15 | Works outside one framework flavor with clear adaptation points  |
| Role clarity          |     15 | Agent boundaries are clear and non-overlapping                   |
| Prompt compactness    |     10 | Low redundancy, concise instructions, low drift risk             |
| Safety and guardrails |     15 | Security, auth, test, and verification expectations are explicit |
| Operational usability |     10 | Easy install, sync, and update flow for client repos             |
| Extensibility         |     10 | Optional skills and overrides integrate cleanly                  |
| Evidence quality      |      5 | Verification outputs are specific and reproducible               |

## Dimension anchors (0 to 5)

Use this anchor scale for every dimension:

- 0: broken or missing
- 1: very weak, high rework needed
- 2: partial, inconsistent
- 3: usable baseline
- 4: strong and mostly universal
- 5: excellent and broadly reusable

## Grade bands

|    Score | Grade | Meaning                                      |
| -------: | :---: | -------------------------------------------- |
|   90-100 |   A   | Highly universal, ready for broad reuse      |
|    80-89 |   B   | Good universality, minor gaps                |
|    70-79 |   C   | Moderate universality, notable tuning needed |
|    60-69 |   D   | Limited universality, major cleanup needed   |
| below 60 |   F   | Not ready for reuse across projects          |

## Hard fail conditions

If any condition below is true, cap grade at D until fixed:

- broken internal references in `.cursor/agents/`, `.cursor/skills/`, or playbooks
- contradictory routing or role instructions across agent docs
- missing or contradictory stack profile selection rules across workflow/orcha/specialists
- missing verification expectations in quality gates
- missing security/auth boundary guidance for API work

## Path to 100

To target 100/100, all of the following must be true:

1. No hard-fail condition is present.
2. `stack_profile` selection is explicit or user-confirmed in every Full/Lean plan.
3. No specialist doc assumes Next.js paths for non-Next.js profiles.
4. Install + usage flow documents first-run context intake for empty `.maestro/context.md`.
5. Verification evidence is reported consistently in completion output.
6. Zero broken references and zero routing contradictions across agent docs.

## Required output format

When reporting a universality review, provide:

1. Final score and grade
2. Per-dimension scores with one-line rationale each
3. Top 3 risks lowering score
4. Top 3 actions to improve score

## Scorecard template

Copy this block into PR notes or release docs:

```markdown
Universality score: XX/100 (Grade X)

- Repo agnosticism (20): X/5 - rationale
- Stack portability (15): X/5 - rationale
- Role clarity (15): X/5 - rationale
- Prompt compactness (10): X/5 - rationale
- Safety and guardrails (15): X/5 - rationale
- Operational usability (10): X/5 - rationale
- Extensibility (10): X/5 - rationale
- Evidence quality (5): X/5 - rationale

Top risks:

1. ...
2. ...
3. ...

Top actions:

1. ...
2. ...
3. ...
```
