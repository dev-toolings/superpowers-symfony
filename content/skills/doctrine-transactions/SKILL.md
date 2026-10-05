---
name: doctrine-transactions
description: Handle Doctrine transactions (ORM 3 wrapInTransaction), optimistic/pessimistic locking, flush strategies, and transaction boundaries
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

# Doctrine Transactions (Symfony)

## Use when
- Several writes must succeed or fail together.
- Two users or workers can edit the same row concurrently.
- Deciding where to flush and who owns the transaction boundary.
- Recovering after a failed flush, a constraint violation, or a lost connection.

## Default workflow
1. Place the transaction boundary in the service layer, not in the controller.
2. Group related changes and flush once, inside `wrapInTransaction()`.
3. Pick the concurrency strategy: `#[ORM\Version]` optimistic locking for edits, `PESSIMISTIC_WRITE` for short critical sections.
4. Handle `OptimisticLockException` and constraint violations explicitly.
5. After a rollback, clear the EntityManager and re-fetch what you still need.

## Guardrails
- On ORM 3, `EntityManager::transactional()` is gone: use `wrapInTransaction()`.
- Outside an explicit transaction each flush commits on its own, so avoid several flushes per operation.
- Keep transactions and pessimistic locks short; no HTTP calls or mail inside.
- Do not reuse entities from a failed unit of work.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Transaction boundaries with a single flush per operation.
- The locking strategy chosen per entity, and how conflicts reach the user.
- Rollback handling and the state of the EntityManager after it.

## References
- `reference.md`
