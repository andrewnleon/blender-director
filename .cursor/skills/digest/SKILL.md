---
name: digest
description: Structured intake and routing skill. Classify intent, scope, risk, owner, and evidence before implementation.
---

# Digest

Use this skill to turn a raw request into an execution-ready routing decision.

## Goal

Create a concise intake result that prevents ambiguity and routes work safely.

## Required output

1. Intent summary
2. Scope mode: Lean, Full, or Hotfix
3. Risk score and confidence
4. Primary owner and optional secondary reviewer
5. Required verification evidence
6. Recommended next command

## Risk scoring rubric

1. +2 security/auth/secrets/session scope
2. +1 API contract or route behavior changes
3. +1 data schema/integration/migration touched
4. +1 missing tests or weak evidence
5. +1 cross-cutting architecture/dependency impact

## Delegation gate

- If risk score >= 3 or confidence < 0.75, recommend specialist routing.
- If one-file low-risk task, keep Lean and avoid delegation.

## CRAFT prompt gate

Before routing, check prompt completeness:

- Context
- Role
- Action
- Format
- Target Audience

If role, assignment, or output format is missing and confidence is low, request missing fields first.
