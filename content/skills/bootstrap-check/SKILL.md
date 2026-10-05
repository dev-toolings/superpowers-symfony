---
name: bootstrap-check
description: Verify Symfony project configuration including .env, services.yaml, doctrine settings, and framework requirements
capabilities: [read, search]
tags: [workflow, config]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Bootstrap Check (Symfony)

## Use when
- Starting work on an unfamiliar or freshly cloned Symfony project.
- The application fails to boot, the container does not compile, or routes are missing.
- Checking `.env`, `config/packages/*`, Doctrine, API Platform or Messenger setup before a change.

## Default workflow
1. Confirm `.env` exists and defines `APP_SECRET`, `DATABASE_URL` and the variables the bundles need.
2. Confirm `vendor/` is installed and `bin/console about` runs.
3. Compile the container (`cache:clear`) and list services and routes.
4. Check the database connection and that the schema matches the mappings.
5. Check the optional stacks present: API Platform resources, Messenger transports.

## Guardrails
- Read only: report what is missing, do not rewrite configuration while checking.
- Never print secret values from `.env` or the vault.
- Prefer ACLs or the correct user over `chmod 777` for cache permission issues.
- Run Doctrine checks against a development database, never production.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The checklist with each item passed or failed.
- The exact fix for each failure (command or file to change).
- What was not checked, and why.

## References
- `reference.md`
