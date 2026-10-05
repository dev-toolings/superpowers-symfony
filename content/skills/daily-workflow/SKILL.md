---
name: daily-workflow
description: Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Daily Workflow (Symfony)

## Use when
- Starting or resuming a work session on a Symfony project.
- Routine tasks: migrations, fixtures, consuming messages, clearing the cache.
- Debugging with `debug:*` commands, the profiler, and the logs.
- Getting a change ready to commit.

## Default workflow
1. Sync: pull, run `composer install` when the lock file changed, apply pending migrations.
2. Start the services the project uses and check `bin/console about`.
3. Work in small test-first cycles with the project's test runner.
4. Debug with `debug:*` commands, the profiler and `var/log/dev.log` before adding dumps.
5. Before committing, run style, static analysis and tests, and remove every `dump()` and `dd()`.

## Guardrails
- Prefix commands with the runner the project uses (Docker or host), from the runtime context.
- Never load fixtures or reset the schema on a shared or production database.
- Do not commit `dump()`, `dd()` or debug-only code.
- Do not patch `vendor/` to work around a problem.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The commands run, with the project's runner prefix.
- Debugging findings, with the evidence behind them.
- A change ready to commit, quality gates green.

## References
- `reference.md`
