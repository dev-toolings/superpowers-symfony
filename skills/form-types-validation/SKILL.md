---

name: symfony:form-types-validation
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Build Symfony forms with custom Form Types, validation constraints, HTTP 422 handling, and multi-step flows
---

# Form Types Validation (Symfony)

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
