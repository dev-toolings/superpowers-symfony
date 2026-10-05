---
name: api-platform-resources
description: Configure API Platform v4 resources with explicit operations, pagination, and typed OpenAPI for clean, versioned REST/GraphQL APIs
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

# Api Platform Resources (Symfony)

## Use when
- Exposing a new entity or class as an `#[ApiResource]`.
- Choosing exactly which of `Get`, `GetCollection`, `Post`, `Put`, `Patch`, and `Delete` the API offers.
- Tuning collection pagination (items per page, partial pagination, client control).
- Documenting operations with typed OpenAPI objects instead of `openapiContext` arrays.

## Default workflow
1. Install only the components you need: `api-platform/symfony`, `api-platform/doctrine-orm`, and optionally `api-platform/graphql`.
2. List every operation in `operations:`, since declaring any one stops the automatic CRUD, and `Put` is never automatic.
3. Set `uriTemplate`, `requirements`, `status`, or `routePrefix` only where the defaults do not fit.
4. Configure pagination through resource attributes or `api_platform.defaults` in `config/packages/api_platform.yaml`.
5. Describe operations with `openapi:` model objects, set `validationContext` groups, then check the routes and the OpenAPI export.

## Guardrails
- Declaring one operation removes the default CRUD: an `operations: [new Get()]` resource has no collection, `Post`, or `Delete`.
- `openapiContext` arrays are deprecated in v4: use the typed `openapi:` option.
- `collectionOperations` and `itemOperations` no longer exist.
- `paginationClientEnabled` lets clients disable pagination: keep `paginationMaximumItemsPerPage` set.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The resource class with its explicit operation list and the routes it produces.
- Pagination and OpenAPI settings, with the reason for each override.
- Route listing and test results for each declared operation.

## References
- `reference.md`
