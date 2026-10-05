---
name: controller-cleanup
description: Refactor fat controllers into lean ones by extracting business logic to services, handlers, and invokable commands
capabilities: [read, search]
tags: [architecture]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Controller Cleanup (Symfony)

## Use when
- A controller action holds business logic, queries, or more than a handful of lines.
- Input parsing, validation, authorization and persistence are mixed in one action.
- A console command does the real work itself instead of delegating it.

## Default workflow
1. List what the action does: input, validation, authorization, business logic, persistence, side effects.
2. Cover the current HTTP behavior with a functional test before moving anything.
3. Map input to a DTO with `#[MapRequestPayload]` or `#[MapQueryString]` and let the validator reject it.
4. Move business logic into a service or a command handler, authorization into a voter, side effects into events or messages.
5. Leave the action to resolve, authorize, delegate and respond, in five to ten lines.

## Guardrails
- Type-hint services as arguments or constructor parameters; never pull them from the container.
- Keep the HTTP behavior identical: same status codes, same payloads.
- Do not move the logic into a "manager" that is the old controller under a new name.
- Write console entry points as invokable `#[AsCommand]` classes (Symfony 7.3+) that delegate to the same services.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Lean actions that delegate.
- The extracted DTOs, services, voters or handlers, one responsibility each.
- Functional tests showing the HTTP behavior is unchanged.

## References
- `reference.md`
