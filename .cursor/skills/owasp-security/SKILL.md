---
name: owasp-security
description: "Apply OWASP Top 10 secure coding practices to APIs, authentication, authorization, integrations, and sensitive data flows."
---

# OWASP Security

Use this skill whenever a task changes authentication, authorization, API routes, external integrations, secrets, sensitive data, or security-sensitive configuration.

## Review baseline

- Enforce object-level, field-level, and function-level authorization in application logic.
- Default to deny; validate identity, tenant, resource ownership, and permitted fields at every boundary.
- Validate and constrain input with schemas or allowlists. Never bind raw client payloads to domain models.
- Protect sensitive workflows with rate limits, quotas, bounded queries, payload limits, and replay or race-condition defenses.
- Treat upstream APIs and user-supplied URLs as untrusted. Use strict outbound allowlists, safe schemes, timeouts, and redirect controls.
- Keep secrets out of source, logs, prompts, generated artifacts, and error responses.
- Use secure session and token lifecycles, including expiration, rotation, replay resistance, and brute-force protection.
- Remove debug or administrative exposure from production paths and keep security headers, CORS, and TLS configuration explicit.

## Verification

For security-sensitive changes, require negative tests for unauthorized object, field, and function access; invalid or expired credentials; malformed upstream responses; SSRF payloads where outbound fetches exist; and abuse of expensive or state-changing workflows.
