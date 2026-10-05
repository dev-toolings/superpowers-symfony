---
name: api-platform-filters
description: "Implement API Platform filters - v4 Parameters API (QueryParameter) and legacy #[ApiFilter] - for search, date, range, boolean, and custom filtering"
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

# Api Platform Filters (Symfony)

## Use when
- A collection endpoint needs search, exact match, range, date, boolean, or sort query parameters.
- One query parameter must search across several properties.
- A filter needs custom query logic that the built-in filters do not cover.
- Migrating `#[ApiFilter]` declarations to the v4 Parameters API.

## Default workflow
1. Pick the style: `parameters` with `QueryParameter` on the operation (v4, recommended), or `#[ApiFilter]` only for v3 and legacy code.
2. Choose a filter class per parameter: `ExactFilter`, `PartialSearchFilter`, `ComparisonFilter`, `SortFilter`, `FreeTextQueryFilter`, `OrFilter`, or `IriFilter`.
3. For a custom filter, implement `FilterInterface` and read the bound value from `$context['parameter']` (legacy: extend `AbstractFilter` and implement `filterProperty()`).
4. Turn on `strictQueryParameterValidation` so unknown query parameters return 400.
5. Add `#[ORM\Index]` on filtered columns, then request the endpoint with matching and non-matching values.

## Guardrails
- Keep v4 filter classes stateless: take request data from `$context`, not the constructor.
- Expose only the properties clients need to filter on.
- Use exact matching for ids and foreign keys: partial `LIKE %value%` cannot use an index.
- In custom filters, validate the value and bind it with `generateParameterName()` and `setParameter()`, never by string concatenation.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The parameters per operation, with filter class and accepted syntax (for example `?price[gte]=1000`).
- Indexes added for the filtered columns.
- Tests for a match, an empty result, and an unknown parameter.

## References
- `reference.md`
