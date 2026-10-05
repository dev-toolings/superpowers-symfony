---
name: doctrine-batch-processing
description: Process large datasets with Doctrine (ORM 3 toIterable, flush+clear, bulk DQL) and memory management
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

# Doctrine Batch Processing (Symfony)

## Use when
- Processing more rows than fit in memory: imports, exports, backfills.
- A command or worker runs out of memory iterating over entities.
- Updating or deleting many rows at once.
- Inserting large volumes through Doctrine or DBAL.

## Default workflow
1. Measure the dataset size and the memory budget of the process.
2. Stream reads with `toIterable()`, or paginate by id (`id > :lastId`) for very large tables.
3. Flush and `clear()` every N items, and re-fetch anything needed after a clear.
4. Use DQL `UPDATE`/`DELETE` or DBAL for bulk writes that need no hydration.
5. Log memory usage and progress, and make the run resumable.

## Guardrails
- Never `findAll()` on a table that grows.
- Entities loaded before a `clear()` are detached: do not modify or persist them.
- Bulk DQL and DBAL skip lifecycle events and listeners. Check what relies on them.
- On ORM 3, `Query#iterate()` and `setSQLLogger()` are gone: use `toIterable()` and a logging middleware.
- Paginate by id rather than by offset: offsets get slower and skip rows when data moves.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- A batch loop with an explicit batch size and clear points.
- The choice between ORM, DQL bulk and DBAL for each write, with the reason.
- Memory measurements before and after on a realistic volume.

## References
- `reference.md`
