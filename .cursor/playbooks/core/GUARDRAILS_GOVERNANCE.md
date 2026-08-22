# Guardrails Governance Baseline

Purpose: make prompt quality, security controls, and delegation evidence enforceable in orchestrated work.

## CRAFT Prompt Quality Gate

Every non-trivial request should include:

- Context: background, purpose, constraints, prior decisions, and concrete details.
- Role: explicit owner persona with domain and depth.
- Action: one primary verb and clear assignment.
- Format: output shape and any length constraints.
- Target Audience: reader level and tone.

Minimum gate:

1. Role is explicit.
2. Assignment is explicit and actionable.
3. Output format is explicit.

If any minimum gate item is missing and confidence is low, orchestrator asks for the missing field before delegation.

## OWASP API Security Gates

The following controls and evidence are required when scope touches API behavior:

- API1 BOLA: object-level authorization checks with cross-tenant negative tests.
- API2 Broken Authentication: token/session lifecycle controls with invalid, expired, and replay tests.
- API3 BOPLA: field-level allowlists, response minimization, and forbidden field read/write tests.
- API4 Resource Consumption: quotas, bounded operations, and abuse stress tests.
- API5 BFLA: function-level authorization with privilege escalation negatives.
- API6 Sensitive Business Flows: abuse-path tests for replay, race, and illegal state transitions.
- API7 SSRF: outbound allowlists and SSRF payload simulation evidence.
- API8 Security Misconfiguration: hardened defaults with config-scan proof.
- API9 Inventory Management: endpoint ownership, version lifecycle, and shw API detection.
- API10 Unsafe API Consumption: vendor trust checks, upstream data validation, and degraded dependency tests.

## Guardrail Types

All AI workflow reviews should map controls to these categories:

- Policy guardrails: legal, compliance, and acceptable-use boundaries.
- Data guardrails: least-privilege data access and privacy constraints.
- Technical guardrails: input/output scanning and response safety transforms.
- User guardrails: reviewer responsibilities and escalation paths.

## Enforcement Workflow

For elevated-risk requests, apply this order:

1. Policy guardrails.
2. Data guardrails.
3. Technical guardrails.
4. User review gate.

Delegation ownership:

- Primary owner: security.
- Secondary owner for weak evidence: qa-engineer.
- Escalation for cross-system architecture decisions: lead-engineer.

## Evidence Requirements

No review may close without evidence for changed logic:

1. Required tests executed and reported.
2. Negative tests for unauthorized access or misuse paths.
3. Delegation audit block complete when delegation happened.
4. Remaining risks explicitly listed when controls are partial.
