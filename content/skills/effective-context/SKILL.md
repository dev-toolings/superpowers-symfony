---
name: effective-context
description: Provide effective context to the coding agent for Symfony development with relevant files, patterns, and constraints
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Effective Context (Symfony)

## Use when
- Asking for help on a Symfony problem, or handing a task over to someone else.
- A previous answer was wrong because versions, bundles or constraints were missing.
- Reporting an error that needs diagnosis.

## Default workflow
1. State the goal and the expected behavior in one or two sentences.
2. Give the versions: Symfony, PHP, and the bundles involved.
3. Include only the files on the path of the problem: entity, service, controller, configuration.
4. Paste the full error with its stack trace, and the relevant log lines.
5. List the constraints (performance, backward compatibility, existing patterns) and what was already tried.

## Guardrails
- Send the code on the path of the problem: not the whole `src/`, not a bare one-line question.
- Do not refer to code that was not shown.
- Strip secrets and personal data from logs and `.env` excerpts.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- A context block following the template in `reference.md`: context, goal, current code, observed behavior, attempts, constraints.
- Versions and bundles, stated explicitly.

## References
- `reference.md`
