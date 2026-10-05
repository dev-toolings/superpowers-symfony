---
name: runner-selection
description: Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Runner Selection (Symfony)

## Use when
- Before the first PHP, console, composer or test command of a session.
- A command fails with a missing PHP, extension or database that the container provides.
- The project uses Docker Compose, Symfony Docker (FrankenPHP), DDEV or the host and the right prefix is unclear.
- The containers may be stopped and the commands must not silently run on the host.

## Default workflow
1. Run the library's runtime context CLI with `--format=markdown` (or `--format=env` for scripts).
2. Read the detected Docker type (`ddev`, `symfony-docker`, a Compose file, or `none`) and whether the containers are running.
3. Use the prefixed console, composer and test commands it prints, such as `docker compose exec php bin/console`.
4. If the containers are stopped, start them with the guidance it prints (`ddev start` or `docker compose up -d`), then run it again.
5. Reuse the same prefix for every command in the session.

## Guardrails
- Never run the host `php` or `composer` when the project expects containers.
- Do not guess the Compose service name: take it from the detected commands.
- Without a Symfony application the CLI prints nothing: say so instead of inventing a runner.
- Do not start or stop containers the task does not need.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The detected environment (Docker type, running state, test framework).
- The prefixed console, composer and test commands for this session.

## References
