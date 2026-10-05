---
name: api-platform-versioning
description: Evolve API Platform APIs via deprecation (deprecationReason/sunset, RFC 8594/9745), the recommended alternative to versioning; plus path/header strategies
capabilities: [read, search, edit, shell]
tags: [api-platform]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Api Platform Versioning (Symfony)

## Use when
- A field, operation, or resource is being renamed or removed and consumers need time to migrate.
- Announcing a removal date to clients with `Sunset` and `Deprecation` headers.
- Deciding between deprecation and parallel `/v1` and `/v2` surfaces.
- A breaking representation change that deprecation and groups cannot express.

## Default workflow
1. Try deprecation first: set `deprecationReason` on the resource, the operation, or `#[ApiProperty]`.
2. Add `sunset:` with a date, and on v4 add `headers` carrying `Deprecation` (RFC 9745) and a `Link` with `rel="successor-version"`.
3. Before v4, emit those headers from a `KernelEvents::RESPONSE` listener.
4. Only if still breaking, expose parallel `uriTemplate` values (`/v1`, `/v2`) with distinct groups, or output DTOs with one provider per version.
5. Mark the old operation as deprecated in OpenAPI, document the changes per version, and test every active version.

## Guardrails
- Prefer deprecation: path versioning is the fallback, not the default.
- Always set a sunset date and keep at most 2 or 3 versions active.
- `deprecationReason` and `sunset` are stable across v3 and v4, but the RFC 9745 `headers` option is v4-era: verify it on your installed version.
- Use groups for minor additive changes rather than a new version.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The deprecation or versioning strategy chosen and why.
- Deprecated elements with their sunset dates and successor links.
- Tests for each active version and for the headers.

## References
- `reference.md`
