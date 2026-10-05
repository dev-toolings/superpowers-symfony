---
name: doctrine-fixtures-foundry
description: Create test data with Zenstruck Foundry v2 factories (PersistentObjectFactory, real objects); define states, sequences, and relationships
capabilities: [read, search, edit, shell]
tags: [doctrine, testing]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Doctrine Fixtures Foundry (Symfony)

## Use when
- Creating test or development data for Doctrine entities.
- Writing a Foundry factory, a named state, a sequence, or a story.
- Building related entities for a test without hand-written setup.
- Migrating legacy Foundry v1 factories or `->object()` calls to v2.

## Default workflow
1. Generate a factory per entity and keep `defaults()` to required and unique fields.
2. Express each variation as an immutable named state (`admin()`, `published()`).
3. Let factories create default relations with `OtherFactory::new()`.
4. Group shared scenarios in stories, and reset the database per test class.
5. Assert on real objects and on the repository through `Factory::assert()`.

## Guardrails
- Use `self::faker()->unique()` for every unique column, or tests collide.
- Do not call `->object()` or `->_real()`: v2 factories return real objects.
- Seed Faker (`FOUNDRY_FAKER_SEED`) when a failure must be reproducible.
- Do not build a factory for trivial data a test can create inline.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Factories with minimal defaults, named states and relation defaults.
- Stories for shared scenarios, when more than one test needs them.
- Test setup wired with the Foundry extension and `#[ResetDatabase]`.

## References
- `reference.md`
