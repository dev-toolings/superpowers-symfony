---
name: api-platform-serialization
description: "Control API Platform serialization with groups, #[Context], IRI links (readableLink/writableLink), and custom context builders"
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

# Api Platform Serialization (Symfony)

## Use when
- Operations must expose different fields (list, read, create, update).
- A related resource must render as an IRI or be embedded.
- A response needs computed or role-dependent fields.
- A property needs normalizer options such as a date format.

## Default workflow
1. Name groups `entity:operation` and set `normalizationContext` and `denormalizationContext` per operation.
2. Tag properties with `#[Groups]` from the Serializer `Attribute` namespace, not the old `Annotation` one.
3. Control relations with `#[ApiProperty(readableLink: false, writableLink: false)]` to force IRIs.
4. Apply per-property options with `#[Context]` instead of writing a normalizer.
5. Add computed fields in a custom normalizer, and dynamic groups in a decorator of `api_platform.serializer.context_builder`.
6. Prevent cycles with `#[MaxDepth]` and `enable_max_depth`, and hide secrets with `#[Ignore]`.

## Guardrails
- Use separate read and write groups: for example `password` only in the create group, `id` only in read groups.
- A related resource is embedded only when it shares a group with the parent; otherwise it renders as an IRI.
- `#[MaxDepth]` has no effect unless `enable_max_depth` is true in the context.
- Keep entities clean: computed fields belong in normalizers.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The groups and contexts per operation, as a field matrix.
- Normalizers or context builders added, and how they are registered.
- Tests or OpenAPI output showing the resulting fields.

## References
- `reference.md`
