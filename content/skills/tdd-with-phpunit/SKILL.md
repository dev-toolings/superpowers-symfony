---
name: tdd-with-phpunit
description: Apply RED-GREEN-REFACTOR with PHPUnit 10/11 for Symfony; KernelTestCase/WebTestCase, attributes (#[Test]/#[DataProvider]), Foundry
capabilities: [read, search, edit, shell]
tags: [testing, tdd]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Tdd With Phpunit (Symfony)

## Use when
- Driving a feature with RED-GREEN-REFACTOR using PHPUnit 10/11 class-based tests.
- Choosing between `TestCase`, `KernelTestCase` and `WebTestCase` for a new behavior.
- Testing a console command, or an invalid form that must answer 422.
- Swapping an external service for a double through the test container.

## Default workflow
1. RED: pick the base class, write the test with `#[Test]`, `#[DataProvider]` and `#[CoversClass]`, run it and check it fails for the right reason.
2. GREEN: write the minimum code that passes.
3. REFACTOR with the suite green, re-running it after each change.
4. Replace an external boundary with `static::getContainer()->set(Service::class, $mock)`.
5. Test commands with `CommandTester`, or with `runCommand()` and `assertCommandIsSuccessful()` on Symfony 8.1+.
6. Assert invalid form submissions with `assertResponseIsUnprocessable()`.

## Guardrails
- Use PHPUnit 10+ attributes, not `@test` or `@dataProvider` annotations.
- Fetch services with `static::getContainer()`, not the legacy `self::$container`.
- Mock only true external boundaries (HTTP clients, third-party SDKs); keep real services and a real database elsewhere.
- `runCommand()` and closures in `getContainer()->set()` need Symfony 8.1+.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The failing PHPUnit output (RED), then the passing run.
- Test files changed, with the base class and attributes used.
- Commands executed.

## References
- `reference.md`
