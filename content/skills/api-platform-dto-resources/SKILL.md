---
name: api-platform-dto-resources
description: Map entities to API DTOs in API Platform v4 with the Symfony Object Mapper (#[Map], stateOptions) for decoupled input/output contracts
capabilities: [read, search, edit, shell]
tags: [api-platform]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Api Platform Dto Resources (Symfony)

## Use when
- The `#[ApiResource]` class must be the API contract, decoupled from the Doctrine entity.
- Entity and API fields differ in name or format (rename, formatted price, computed value).
- Create, update, or list operations need their own input or output shape.
- Migrating code that relied on `DataTransformerInterface`, which no longer exists.

## Default workflow
1. Require `symfony/object-mapper` and set `stateOptions: new Options(entityClass: ...)` on the DTO resource.
2. Bind the DTO and the entity with `#[Map(source: ...)]` and `#[Map(target: ...)]`, and use `#[Map(transform: ...)]` for computed fields.
3. For distinct shapes, create input and output classes and wire them with `input:` and `output:` on each operation.
4. When mapping needs real logic, write a custom `ProcessorInterface` that calls `ObjectMapperInterface::map()`.
5. Test each operation: payload in, response shape out.

## Guardrails
- The automatic Object Mapper provider and processor only apply when `stateOptions` has an `entityClass` and both the DTO and the entity carry `#[Map]`.
- `DataTransformerInterface` is gone: use Object Mapper or a provider and processor.
- v3.4 has no Object Mapper: map manually in a `ProviderInterface` and a `ProcessorInterface`.
- Never return the entity itself from a DTO resource: only mapped fields reach the client.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The resource, input, and output classes with their `#[Map]` bindings.
- The mapping path chosen (Object Mapper or custom processor) and why.
- Tests showing the request and response shape of each operation.

## References
- `reference.md`
