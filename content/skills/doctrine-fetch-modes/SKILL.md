---
name: doctrine-fetch-modes
description: Optimize Doctrine fetching with DTO hydration (SELECT NEW; partial removed in ORM 3), lazy loading, query hints, and DBAL 4 access
capabilities: [read, search, edit, shell]
tags: [doctrine, performance]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Doctrine Fetch Modes (Symfony)

## Use when
- A list or detail endpoint runs one query per row (N+1) on a relation.
- A read-only list needs a few columns, not full managed entities.
- Choosing `LAZY`, `EAGER` or `EXTRA_LAZY` on a mapping, or replacing an ORM 2 feature removed in ORM 3 (`partial`, `Query::setFetchMode()`).
- A report or projection query drops to raw SQL through DBAL 4.

## Default workflow
1. Confirm the N+1 or over-fetch in the Symfony profiler before changing any mapping.
2. Keep relations on `fetch: 'LAZY'`; set `fetch: 'EXTRA_LAZY'` on large collections so `count()`, `contains()` and `slice()` run targeted SQL.
3. Load the relations a use case needs with a fetch join in the repository (`addSelect()` plus `leftJoin()`).
4. For read-only lists, project into a `readonly` DTO with `SELECT NEW` (constructor argument order must match the `NEW` list).
5. Use `Query::HINT_READ_ONLY` or an index-by alias (`createQueryBuilder('p', 'p.id')`) when the result is only displayed or looked up by id.
6. For raw SQL, use the DBAL 4 methods (`fetchAllAssociative()`, `fetchOne()`, `executeStatement()`).

## Guardrails
- ORM 3 removed the `partial` DQL keyword, `Query::HINT_FORCE_PARTIAL_LOAD` and `Query::setFetchMode()`: do not reintroduce them.
- Avoid `fetch: 'EAGER'` on a mapping; a fetch join in the query gives the same result per use case.
- `SELECT NEW` returns DTOs, not managed entities: never modify or flush them.
- DBAL 4 removed `query()`, `exec()` and `fetchAll()`.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Repository methods with the fetch strategy chosen per use case.
- DTO classes and the `SELECT NEW` queries that fill them.
- Query count before and after, from the profiler or `doctrine:query:dql --show-sql`.

## References
- `reference.md`
