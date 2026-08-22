# Security Review Checklist

Use this checklist for orchestrator-led reviews that include security-sensitive behavior.

## Prompt Completeness Gate (CRAFT)

- Context includes goal, constraints, and prior decisions.
- Role is explicit and matches task domain.
- Action is explicit and singular.
- Format and target audience are explicit.

## Delegation and Ownership

- Primary owner selected from domain routing rules.
- Secondary reviewer added only when evidence gap exists.
- Model preference routing recorded for delegated work.

## API Authorization and Authentication

- Object-level authorization checks verified.
- Function-level authorization checks verified.
- Field-level allowlists verified for read and write paths.
- Token/session lifecycle controls validated.

## Abuse and Flow Controls

- Sensitive business flow misuse paths tested.
- Resource-consumption protections validated.
- SSRF protections and outbound policy validated.

## Configuration and Inventory

- Security misconfiguration checks passed.
- API inventory and version lifecycle checks passed.
- Third-party API trust-boundary controls validated.

## Required Evidence

- Negative tests for unauthorized access and privilege escalation.
- Abuse-case or adversarial test output attached.
- Config or policy scan outputs attached when relevant.
- Delegation audit output block included when delegation occurred.

## Closure

- High-severity findings resolved or formally accepted.
- Residual risks documented with owner and follow-up date.
