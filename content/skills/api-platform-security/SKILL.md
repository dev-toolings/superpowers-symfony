---
name: api-platform-security
description: Secure API Platform resources with security expressions, voters, securityPostValidation, and operation-level access control
capabilities: [read, search, edit, shell]
tags: [api-platform, security]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Api Platform Security (Symfony)

## Use when
- Restricting who may call each operation of an API Platform resource.
- Authorization depends on the object (owner) or on the submitted data.
- Users must see only a subset of a collection.
- Fields must be hidden depending on role or ownership.

## Default workflow
1. Set `security` per operation with `is_granted()`, `object`, and `user`, plus a `securityMessage`.
2. Move complex rules into voters: `is_granted('POST_EDIT', object)`.
3. When the rule depends on input, use `securityPostDenormalize`, or `securityPostValidation` to run after the Validator.
4. Scope rows with a `QueryCollectionExtensionInterface` (and `QueryItemExtensionInterface`) or a state provider.
5. Hide fields with serializer groups and a decorated context builder, and guard the firewall with `access_control`.
6. Test both the grant and the deny case for every protected operation.

## Guardrails
- Never filter rows with a `security` expression on a collection: it gates the whole collection, it does not scope it.
- Order of checks: `security`, denormalization, `securityPostDenormalize`, validation, `securityPostValidation`.
- `previous_object` exists only in `securityPostDenormalize`, and `request` only at resource level.
- Deny by default and mark secrets such as `password` with `#[Ignore]`.
- `getAccessDecision()` and the Twig `access_decision()` helper need Symfony 8.1 or later: verify before using them.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The security expression and message per operation, and the voters involved.
- How collections and fields are scoped per user.
- Tests covering allowed, forbidden, and anonymous access.

## References
- `reference.md`
