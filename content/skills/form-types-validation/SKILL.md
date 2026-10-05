---
name: form-types-validation
description: Build Symfony forms with custom Form Types, validation constraints, HTTP 422 handling, and multi-step flows
capabilities: [read, search, edit, shell]
tags: [security]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Form Types Validation (Symfony)

## Use when
- Building or changing a Symfony form type.
- Adding validation constraints on an entity, a DTO, or a form field.
- Different rules per context (registration vs profile) through validation groups.
- Converting values with a data transformer or reacting with form events.
- Writing a custom constraint, or a form spread across several steps.

## Default workflow
1. Put business constraints on the entity or DTO; keep form-level constraints for UI-only rules such as uploads.
2. Build the form type with explicit field types and options.
3. Split rules into validation groups when contexts differ.
4. Add data transformers or `PRE_SET_DATA`/`PRE_SUBMIT` listeners only where the model and the view disagree.
5. In the controller, check `isSubmitted() && isValid()` and pass the form itself to `render()`.

## Guardrails
- Pass the form, not `createView()`, to `render()` so an invalid submit answers 422.
- A transformer that cannot convert throws `TransformationFailedException`, it never returns garbage.
- Do not duplicate the same constraint on the form and on the entity.
- Multi-step flows and the custom violation mapper are recent: verify the installed Symfony version first.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Form types and the constraints they rely on, with their groups.
- Transformers, listeners or custom constraints, each with a reason.
- Tests for a valid submit, an invalid submit (422), and each custom constraint.

## References
- `reference.md`
