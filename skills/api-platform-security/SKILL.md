---

name: symfony:api-platform-security
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Secure API Platform resources with security expressions, voters, securityPostValidation, and operation-level access control
---

# Api Platform Security (Symfony)

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
