---
name: api-platform-filters
description: "Implement API Platform filters - Parameters API (QueryParameter, v5/4.4/4.3) and the #[ApiFilter] attribute deprecated since 4.4 - for search, date, range, boolean, and custom filtering"
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
- Migrating `#[ApiFilter]` declarations (deprecated since 4.4) to the Parameters API, by hand or with `api:upgrade-filter`.

## Default workflow
1. Declare `parameters` with `QueryParameter` on the operation; keep `#[ApiFilter]` only in 3.4 code or code not yet migrated.
2. Choose a filter class per parameter, checking the installed version: `ExactFilter`, `PartialSearchFilter`, `FreeTextQueryFilter`, `OrFilter`, `IriFilter` (4.2+), `ComparisonFilter`, `SortFilter` (4.3+), `StartSearchFilter`, `EndSearchFilter`, `ChainFilter` (4.4+).
3. For a custom filter, implement `FilterInterface` and read the bound value from `$context['parameter']` (`AbstractFilter` and `filterProperty()` are deprecated since 4.4: keep them for 4.3 and 3.4 code).
4. Turn on `strictQueryParameterValidation` so unknown query parameters return 400.
5. Add `#[ORM\Index]` on filtered columns, then request the endpoint with matching and non-matching values.

## Guardrails
- Keep filter classes stateless: take request data from `$context`, not the constructor.
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
