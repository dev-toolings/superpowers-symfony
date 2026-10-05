---
name: cqrs-and-handlers
description: Implement CQRS in Symfony with separate Command and Query buses/handlers using the Messenger component
capabilities: [read, search]
tags: [architecture, messenger]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Cqrs And Handlers (Symfony)

## Use when
- Separating writes from reads with distinct command and query buses.
- A service both changes state and returns data for display.
- Adding a use case as a command or a query with its own handler.

## Default workflow
1. Name the use case: a command changes state, a query returns data.
2. Write the message as a readonly class and exactly one handler for it.
3. Configure separate command and query buses; give the command bus the `validation` and `doctrine_transaction` middleware.
4. Inject the buses behind small interfaces, or the native buses with `#[Target]`.
5. Dispatch from a thin controller and return the query result or the new id.

## Guardrails
- Commands return nothing, or at most the id they created.
- Queries have no side effects, so they can be cached and retried.
- One handler per message; no handler dispatches back onto the bus it serves.
- Read models for complex queries are optional: add them when a query outgrows the entities.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Commands, queries and their handlers.
- The bus configuration and its middleware.
- Handler tests, and a functional test through the controller.

## References
- `reference.md`
