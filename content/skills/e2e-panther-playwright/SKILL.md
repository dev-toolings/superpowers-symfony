---
name: e2e-panther-playwright
description: Write end-to-end tests with Symfony Panther 2.4 for browser automation or Playwright for complex scenarios
capabilities: [read, search]
tags: [testing]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# E2e Panther Playwright (Symfony)

## Use when
- A flow needs a real browser: JavaScript, multi-page journeys such as login, checkout or signup.
- `WebTestCase` cannot see the behavior because it depends on client-side rendering.
- Cross-browser needs (WebKit, tracing, video) that WebDriver does not cover: run Playwright separately.
- Debugging a browser test that fails only in CI.

## Default workflow
1. Pick the client: `static::createPantherClient()` for a real browser, `static::createClient()` when no JavaScript is needed.
2. Install `symfony/panther` and `dbrekelmans/bdi`, run `vendor/bin/bdi detect drivers`, and register `ServerExtension` in `phpunit.dist.xml`.
3. Extend `PantherTestCase` and drive the flow with explicit waits: `waitFor()`, `waitForVisibility()`, `waitForElementToContain()`.
4. Assert future state with `assertSelectorWillExist()` or `assertSelectorWillContain()`, current state with `assertSelectorIsVisible()`.
5. Keep the suite in `tests/E2E` and reset the database between tests (DAMADoctrineTestBundle or Foundry).
6. Debug with `PANTHER_NO_HEADLESS=1` and `--debug`; set `PANTHER_NO_SANDBOX=1` in CI.

## Guardrails
- Never rely on implicit timing: every async step gets a `waitFor*` or an `assertSelectorWill*`.
- Target `data-testid` attributes, not styling classes.
- Delete the PNGs written by `takeScreenshot()` or `PANTHER_ERROR_SCREENSHOT_DIR`; never commit them.
- E2E is slow: cover critical paths only and keep it apart from unit tests.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- E2E test files, with the client type and the wait strategy used.
- Driver setup, `ServerExtension` registration and the `PANTHER_*` variables needed locally and in CI.
- Confirmation that screenshots were cleaned up.

## References
- `reference.md`
