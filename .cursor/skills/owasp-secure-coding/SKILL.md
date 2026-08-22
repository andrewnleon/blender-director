---
name: owasp-secure-coding
description: OWASP Top 10 2025, API Security Top 10, and LLM Top 10 checks for agent work. Load when writing routes, auth, DB, CSP, AI features, or security review.
---

# OWASP secure coding (portfolio / Next.js)

Awareness + verify checklist. Not full ASVS coverage. Deeper verify → [ASVS](https://owasp.org/www-project-application-security-verification-standard/).

Load when: routes, server actions, auth, DB, CSP, secrets, AI/LLM, dependency adds, security review.

## Web — Top 10:2025

| ID | Risk | Do |
|----|------|----|
| A01 | Broken Access Control | Authz on every mutation + object access; never trust client role/id |
| A02 | Security Misconfiguration | CSP via `config/cspConfig.ts`; harden headers in `src/proxy.ts`; no debug in prod |
| A03 | Software Supply Chain | `pnpm audit`; package-age rule before deps; pin versions |
| A04 | Cryptographic Failures | Secrets server-only; no tokens in `NEXT_PUBLIC_*`; HTTPS only |
| A05 | Injection | Zod at boundary; Drizzle builders not string-concat SQL; escape/encode HTML |
| A06 | Insecure Design | Threat-model auth/payments/AI tools before build |
| A07 | Authentication Failures | Session check server-side; rate-limit login/public write |
| A08 | Software/Data Integrity | No unsigned client trust; verify webhook signatures |
| A09 | Logging/Alerting Failures | Log auth failures; never log secrets/PII/tokens |
| A10 | Exceptional Conditions | Safe 4xx/5xx shapes; no stack traces to client |

## API — Top 10:2023 (when APIs exist)

| ID | Do |
|----|----|
| API1 BOLA | Authz per object id |
| API2 Authn | Validate session/token at handler |
| API3 Property authz | No mass-assign; allowlist fields |
| API4 Resource | Rate limit; payload size caps |
| API5 Function authz | Admin vs user routes separated |
| API6 Business flows | Throttle abuse-prone flows |
| API7 SSRF | Allowlist URLs; block link-local/metadata |
| API8 Misconfig | CORS/CSP/error config reviewed |
| API9 Inventory | Document routes; no orphan debug APIs |
| API10 Unsafe consume | Validate third-party API data |

## LLM — Top 10 (ai-architect)

| ID | Do |
|----|----|
| LLM01 Prompt injection | Treat user/RAG as untrusted; separate system vs user |
| LLM02 Insecure output | Sanitize before HTML/tool exec |
| LLM06 Sensitive disclosure | Redact secrets from prompts/logs |
| LLM07 Insecure plugins | Auth every tool; least privilege |
| LLM08 Excessive agency | Bound tools; human confirm destructive |

## Portfolio paths

| Concern | Where |
|---------|-------|
| CSP | `config/cspConfig.ts` |
| Headers / proxy | `src/proxy.ts` (not `middleware.ts`) |
| Auth patterns | `.cursor/skills/auth-boundaries/SKILL.md` |
| API shape | `.cursor/skills/api-contracts/SKILL.md` |

## Verify smoke

- Unauth mutation → 401/403
- Bad body → 400 safe shape
- `pnpm audit` — no unmitigated high/critical
- No secrets in client bundle / logs
