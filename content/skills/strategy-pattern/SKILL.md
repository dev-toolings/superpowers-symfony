---
name: strategy-pattern
description: Implement the Strategy pattern with Symfony's tagged services for runtime algorithm selection and extensibility
capabilities: [read, search]
tags: [architecture]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Strategy Pattern (Symfony)

## Use when
- One operation has several interchangeable algorithms chosen at runtime, such as payment providers or export formats.
- A `switch` or `match` on a type string keeps growing.
- New variants must be added without editing the code that selects them.

## Default workflow
1. Define the strategy interface, with a `supports()` method or a key per strategy.
2. Tag every implementation through `#[AutoconfigureTag]` on the interface or on each class.
3. Inject them with `#[AutowireIterator]` to try each in order, or `#[AutowireLocator]` to fetch one by key.
4. Set priorities where evaluation order matters, and register a fallback strategy.
5. Test each strategy alone, and the selector with fakes.

## Guardrails
- The selector fails explicitly when no strategy supports the input.
- Keep strategies stateless and independent of each other.
- Two cases that will not grow do not need the pattern: a `match` is enough.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The interface and its tagged implementations.
- The selector, with its order and its fallback.
- Tests per strategy and for the no-match case.

## References
- `reference.md`
