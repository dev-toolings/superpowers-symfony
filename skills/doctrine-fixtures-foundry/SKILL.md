---

name: symfony:doctrine-fixtures-foundry
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Create test data with Zenstruck Foundry v2 factories (PersistentObjectFactory, real objects); define states, sequences, and relationships
---

# Doctrine Fixtures Foundry (Symfony)

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
