---
name: symfony:symfony-voters
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement granular authorization with Symfony Voters; decouple permission logic from controllers; test authorization separately
---

# Symfony Voters (Symfony)

## Use when
- Hardening access-control or validation boundaries.
- Aligning voters/security expressions with domain rules.

## Default workflow
1. Map actor/resource/action decision matrix.
2. Implement voter/constraint logic at the right boundary.
3. Wire checks at controllers and API operations.
4. Test allowed/forbidden/invalid paths comprehensively.

## Guardrails
- Avoid policy logic duplication across layers.
- Do not leak privileged state via error detail.
- Preserve explicit deny behavior for sensitive actions.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Security boundary updates.
- Integration points enforcing decisions.
- Negative-path test results.

## References
- `reference.md`
- `docs/complexity-tiers.md`
