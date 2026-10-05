---
name: functional-tests
description: Write functional tests for Symfony controllers and HTTP endpoints using WebTestCase, getContainer, loginUser, and DAMA rollback
capabilities: [read, search, edit, shell]
tags: [testing]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Functional Tests (Symfony)

## Use when
- A controller or HTTP endpoint must be checked through the kernel: status, redirect, rendered DOM, form errors, emails.
- A repository or service must be tested against the real database with `KernelTestCase`.
- An authenticated or role-restricted route needs coverage via `loginUser()`.
- Key URLs need cheap smoke tests.

## Default workflow
1. Choose the base class: `WebTestCase` for HTTP, `KernelTestCase` for services, plain `TestCase` for pure logic.
2. Call `static::createClient()` directly (never `bootKernel()` first) and read private services with `static::getContainer()`.
3. Authenticate with `$client->loginUser($user)` instead of replaying the login form.
4. Assert the response and the DOM: `assertResponseIsSuccessful()`, `assertResponseRedirects()`, `assertSelectorTextContains()`, `assertEmailCount()`.
5. Isolate tests with the DAMADoctrineTestBundle `PHPUnitExtension`, plus Foundry reset for fixtures.
6. Add smoke tests with a data provider and hardcoded URLs.

## Guardrails
- Use the real database and real repositories; do not mock the EntityManager or repositories in data-touching tests.
- Invalid form submissions assert 422 with `assertResponseIsUnprocessable()` (Symfony 8.0+ behavior).
- `.env.local` is not loaded in the test environment: use `.env.test` or `.env.test.local`.
- `assertSessionHasFlashMessage()` requires Symfony 8.1+.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Test classes with the base class chosen for each.
- The authentication and database isolation strategy.
- Status codes, DOM assertions and smoke URLs covered.

## References
- `reference.md`
