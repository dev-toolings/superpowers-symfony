---

name: symfony:doctrine-fetch-modes
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Optimize Doctrine fetching with DTO hydration (SELECT NEW; partial removed in ORM 3), lazy loading, query hints, and DBAL 4 access
---

# Doctrine Fetch Modes (Symfony)

## Use when
- Designing entity relations or schema evolution.
- Improving Doctrine correctness/performance.

## Default workflow
1. Model ownership/cardinality and transactional boundaries.
2. Apply mapping/schema changes with migration safety.
3. Tune fetch/query behavior for hot paths.
4. Verify lifecycle behavior with targeted tests.

## Guardrails
- Keep owning/inverse sides coherent.
- Avoid destructive migration jumps in one release.
- Eliminate accidental N+1 and over-fetching.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Entity/migration changes.
- Integrity and performance decisions.
- Validation outcomes and rollback notes.

## References
- `reference.md`
- `docs/complexity-tiers.md`
