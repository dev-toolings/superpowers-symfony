---
name: api-platform-tests
description: Test API Platform resources with ApiTestCase; assert collections, items, filters, JSON schema, and authentication
capabilities: [read, search, edit, shell]
tags: [api-platform, testing]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Api Platform Tests (Symfony)

## Use when
- Writing functional tests for API Platform endpoints: collection, item, create, update, delete.
- Asserting validation errors (422) and access control (401, 403).
- Checking filters, pagination, or the JSON schema of responses.
- Setting up a clean database and test data for API tests.

## Default workflow
1. Extend `ApiTestCase` and seed data with Foundry factories (`createOne`, `createMany`).
2. Reset state with `#[ResetDatabase]` and the `Factories` trait, with DAMA rolling back each test.
3. Call `static::createClient()->request()` and assert the status code, content type, and `assertJsonContains()`.
4. Authenticate with `auth_bearer` and cover the anonymous, owner, and other-user cases.
5. Assert `hydra:member` and `hydra:totalItems` for filters and pagination.
6. Assert the shape with `assertMatchesResourceItemJsonSchema()` and `assertMatchesResourceCollectionJsonSchema()`.

## Guardrails
- Send `PATCH` with the `application/merge-patch+json` content type.
- `#[ResetDatabase]` needs PHPUnit 10+ and Foundry 2.9: use the `ResetDatabase` trait on PHPUnit 9.
- Cover the failure paths too: 404, 422, 401, 403.
- Read the configured items per page rather than hardcoding a page size in assertions.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The test classes added and the endpoints they cover.
- Factories and reset strategy used.
- Test run output, including the failure paths.

## References
- `reference.md`
