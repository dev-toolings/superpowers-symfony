---

name: symfony:e2e-panther-playwright
allowed-tools:
  - Read
  - Glob
  - Grep
description: Write end-to-end tests with Symfony Panther 2.4 for browser automation or Playwright for complex scenarios
---

# E2e Panther Playwright (Symfony)

## Use when
- Building regression-safe behavior with TDD/functional/e2e tests.
- Converting bug reports into executable failing tests.

## Default workflow
1. Write failing test for target behavior and one boundary case.
2. Implement minimal code to pass.
3. Refactor while preserving green suite.
4. Broaden coverage for invalid/unauthorized/not-found paths.

## Guardrails
- Prefer deterministic fixtures/builders.
- Assert observable behavior, not internal implementation.
- Keep tests isolated and stable in CI.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- RED/GREEN/REFACTOR trace.
- Test files changed and executed commands.
- Coverage and confidence notes.

## References
- `reference.md`
- `docs/complexity-tiers.md`
