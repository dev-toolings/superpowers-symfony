---
name: interfaces-and-autowiring
description: "Master Symfony Dependency Injection with autowiring, #[Target] interface binding, decoration, and tagged services"
capabilities: [read, search]
tags: [architecture]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Interfaces And Autowiring (Symfony)

## Use when
- A service depends on a concrete class and must be swappable or replaced in tests.
- Several implementations of one interface exist and the right one must be injected.
- Adding cross-cutting behavior (logging, caching, retries) around an existing service.
- Injecting scalars, parameters, env vars, or every service carrying a tag.
- Autowiring fails with "cannot autowire" or an ambiguous type.

## Default workflow
1. Extract a focused interface for what the consumer actually needs.
2. Let autowiring bind it when there is a single implementation.
3. With several implementations, pick one per consumer through a named alias and `#[Target]`.
4. Add behavior around a service with `#[AsDecorator]` instead of editing or extending it.
5. Inject scalars with `#[Autowire]` and tagged collections with `#[AutowireIterator]`.
6. Confirm the result with `debug:autowiring` for each type involved.

## Guardrails
- Constructor injection with `private readonly` dependencies; no setter injection, no container access.
- Keep interfaces small: one consumer need per interface.
- Make services `final` by default and decorate them rather than extend them.
- Use lazy services or service closures only for expensive dependencies that some paths skip.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Interfaces and the bindings or aliases that select each implementation.
- Decorators or tagged collections, with their priority.
- The `debug:autowiring` output for the types involved.

## References
- `reference.md`
