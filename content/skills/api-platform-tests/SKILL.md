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
- Designing or evolving API Platform contracts and operations.
- Aligning serialization, validation, and security behavior.

## Default workflow
1. Define operation-level contract and payload boundaries.
2. Implement resource/DTO/provider/processor changes with explicit mapping.
3. Apply operation-specific validation and security constraints.
4. Validate functional behavior across happy and negative paths.

## Guardrails
- Keep API contract explicit and version-aware.
- Avoid exposing internal entity fields implicitly.
- Prevent drift between docs and actual serialization.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- API artifacts changed (resource/DTO/provider/processor).
- Contract/security decisions and rationale.
- Functional verification results.

## References
- `reference.md`
- `docs/complexity-tiers.md`
