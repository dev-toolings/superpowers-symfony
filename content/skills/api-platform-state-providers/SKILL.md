---
name: api-platform-state-providers
description: Master API Platform State Providers and Processors (v5, 4.4, 4.3) (ProviderInterface/ProcessorInterface) to decouple data retrieval and persistence from entities
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

# Api Platform State Providers (Symfony)

## Use when
- Reading data from a source other than the default Doctrine provider.
- Wrapping the Doctrine provider to post-process results (return a DTO, enforce a tenant scope).
- Business logic must run before or after persisting (hashing, slug, dispatching a message).
- A v4 read endpoint must dispatch a query or command through a processor.

## Default workflow
1. Implement `ProviderInterface::provide()` returning `iterable|object|null`, where `null` gives a 404 (v3.4 declares `mixed`).
2. To keep Doctrine fetching, inject `api_platform.doctrine.orm.state.item_provider` and `api_platform.doctrine.orm.state.collection_provider` with `#[Autowire]`.
3. Implement `ProcessorInterface::process()` and delegate to `api_platform.doctrine.orm.state.persist_processor` or `remove_processor`.
4. Wire them with `provider:` and `processor:` on the resource or the operation; autoconfiguration registers them, and the `api_platform.state_provider` or `api_platform.state_processor` tag is only needed without it.
5. For a processor on `GET` or `GetCollection`, add `write: true` (v4 only).

## Guardrails
- Run pre-persist logic before calling the inner processor and side effects after it returns.
- A processor returns the created or modified object, and nothing for `DELETE`.
- `write: true` on safe methods is v4 only: v3.4 processors run on write methods only.
- `DataProvider` and `DataPersister` are v2 interfaces and no longer exist.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The providers and processors added, and the operations they are wired to.
- Which built-in services are decorated.
- Tests for the not-found, success, and side-effect paths.

## References
- `reference.md`
