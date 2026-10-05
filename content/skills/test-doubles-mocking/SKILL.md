---
name: test-doubles-mocking
description: Create test doubles with PHPUnit mocks for isolated unit testing in Symfony
capabilities: [read, search]
tags: [testing]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Test Doubles Mocking (Symfony)

## Use when
- A class under test depends on a collaborator that is slow, external or non-deterministic, such as a payment gateway or a message bus.
- An interaction must be verified, such as `persist()` and `flush()` or a dispatched message.
- A repository needs an in-memory fake implementing its interface.
- Choosing between a dummy, stub, mock, spy or fake.

## Default workflow
1. Pick the double by need: stub to feed values, mock to verify a call, fake for a working simplified implementation.
2. Create it with `$this->createMock(Interface::class)` and stub with `->method('charge')->willReturn(...)`.
3. Verify only when the interaction matters: `expects($this->once())->with(...)`, or `$this->callback()` to inspect a dispatched message.
4. Script behavior with `willReturnOnConsecutiveCalls()`, `willThrowException()` or `willReturnCallback()`.
5. For repositories, write an `InMemory` fake implementing the interface.
6. Use `ProphecyTrait` with `prophesize()` and `reveal()` only if the project already relies on Prophecy.

## Guardrails
- Do not mock the class under test; a partial mock (`onlyMethods()`) is a last resort.
- Mock interfaces, not concrete classes.
- Prefer stubs over mocks, with one mock assertion per test.
- Do not over-mock: behavior that touches the database belongs in a functional test with the real repository.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The double type chosen for each collaborator, and why.
- Interactions verified, limited to those that matter.
- Fakes added under `tests/Fake`, if any.

## References
- `reference.md`
