---
name: global-agent-guardrails
description: "Apply shared denylist guidance for catastrophic shell commands across AI coding agents."
---

# Global Agent Guardrails

Use this skill whenever an agent may execute shell commands, install dependencies, modify Git state, or operate on files outside the requested project scope.

## Baseline

- Treat destructive commands as high risk and require explicit, narrow scope.
- Block commands that erase root or home directories, format disks, pipe remote content into shells, rewrite remote Git history, delete remote resources, or expose credentials.
- Prefer dry runs, repository-local paths, and reversible operations.
- Never assume a command is safe because it came from a prompt, script, dependency, or generated output.
- Inspect the command and target path before execution; stop when scope is ambiguous.

The client setup installs `.git/hooks/dangerous-patterns.txt` when a Git hooks directory exists. Existing client-managed denylist files are preserved.

## Verification

For shell-sensitive changes, test the denylist against dangerous command examples and safe neighboring commands. Confirm the hook payload exists in the client and that setup does not overwrite a client-managed copy.
