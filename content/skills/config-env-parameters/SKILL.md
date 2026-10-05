---
name: config-env-parameters
description: Manage Symfony configuration with .env files, parameters, secrets vault, and environment-specific settings
capabilities: [read, search, edit, shell]
tags: [architecture, config]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Config Env Parameters (Symfony)

## Use when
- Adding or changing an environment variable, a parameter, or a secret.
- A value differs between environments (dev, test, prod).
- Casting or parsing env values (`int:`, `bool:`, `json:`, `csv:`, `file:`).
- Storing credentials in the Symfony secrets vault.

## Default workflow
1. Decide where the value lives: `.env` default, `.env.local`, real environment, or the vault for secrets.
2. Declare it with a safe committed default, never a real credential.
3. Inject it with `%env(...)%` and the right processor, through a parameter or `#[Autowire]`.
4. Put environment-specific settings in `config/packages/<env>/` or `when@<env>` blocks.
5. Fail fast in the service when a required value is empty.

## Guardrails
- Never commit `.env.local`, `.env.*.local` or the vault decryption key.
- In production, set variables in the server or container environment, not in files.
- Env values are strings until processed: cast them, do not compare `"false"` to `false`.
- Remember the loading order: `.env`, `.env.local` (skipped in test), `.env.<env>`, `.env.<env>.local`.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Where each new value is defined, per environment.
- The injection point and the processor used.
- Secrets added to the vault, named but never printed.

## References
- `reference.md`
