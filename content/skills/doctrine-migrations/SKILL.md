---
name: doctrine-migrations
description: Create and manage Doctrine migrations (bundle 4.x, library 3.9) for schema versioning; handle dependencies, rollbacks, and production deployment
capabilities: [read, search, edit, shell]
tags: [doctrine]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Doctrine Migrations (Symfony)

## Use when
- A mapping change needs a schema migration (new column, index or table).
- Reviewing a generated `make:migration` or `doctrine:migrations:diff` file before it is applied.
- Rolling back a version, or deploying pending migrations to production.
- Tuning `doctrine_migrations.yaml` (`transactional`, `all_or_nothing`, `enable_service_migrations`).

## Default workflow
1. Change the entity mapping, then generate the migration with `make:migration` or `doctrine:migrations:diff`.
2. Read every `addSql()` line: a rename can appear as drop plus add, and index churn is common.
3. Write a real `down()` that reverses `up()`, and keep one concern per migration.
4. Check `doctrine:migrations:status`, preview with `doctrine:migrations:migrate --dry-run`, then run `doctrine:migrations:migrate`.
5. Roll back with `doctrine:migrations:migrate prev` or `doctrine:migrations:execute` with `--down`.
6. With several entity managers, pass `--em` to every migrations command.

## Guardrails
- Never edit an already-applied migration: add a new one.
- Keep diff-generated migrations schema only; put data changes in a dedicated, idempotent migration or command.
- Keep the typed signatures `up(Schema $schema): void` and `down(Schema $schema): void`.
- `all_or_nothing` is mostly effective on PostgreSQL, since most MySQL DDL commits implicitly.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Migration files with a reviewed `up()` and a working `down()`.
- Output of `doctrine:migrations:status` and the dry-run, plus the rollback command.
- Any `doctrine_migrations.yaml` change and why.

## References
- `reference.md`
