---
name: value-objects-and-dtos
description: Design Value Objects for domain concepts and DTOs for data transfer with proper immutability (readonly) and validation
capabilities: [read, search]
tags: [architecture]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Value Objects And Dtos (Symfony)

## Use when
- A domain concept with rules of its own (money, email, address) travels as raw scalars.
- Data crosses a boundary: request input, API output, message payload.
- Storing a value object inside a Doctrine entity.

## Default workflow
1. Decide: a value object for a domain concept with invariants, a DTO for data crossing a boundary.
2. Make it `readonly`, validate in the constructor, and fail fast.
3. Give value objects equality by value and operations that return new instances.
4. Persist value objects as Doctrine embeddables.
5. Keep input DTOs (validation constraints) apart from output DTOs (serializer attributes).

## Guardrails
- No setters and no mutation: a change returns a new instance.
- DTOs carry data only, with no behavior.
- Never expose entities directly as API input or output.
- Store money as an integer in minor units, never as a float.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Value objects with their invariants and equality.
- Input and output DTOs, and their mapping to and from entities.
- Unit tests for each invariant.

## References
- `reference.md`
