---
name: ports-and-adapters
description: Implement Hexagonal Architecture (Ports and Adapters) in Symfony; separate domain logic from infrastructure with clear boundaries
capabilities: [read, search]
tags: [architecture]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Ports And Adapters (Symfony)

## Use when
- Domain rules must not depend on Doctrine, HTTP, or a vendor SDK.
- An infrastructure dependency (storage, payment, mail provider) must be swappable or faked.
- Structuring a bounded context into Domain, Application and Infrastructure layers.

## Default workflow
1. Model the domain in plain PHP: entities and value objects without ORM attributes.
2. Declare ports as interfaces inside the domain, such as a repository interface.
3. Write use cases in the application layer as commands and handlers that depend only on ports.
4. Implement adapters in infrastructure (Doctrine repository, API client) and map entities outside the domain, with XML mapping.
5. Bind each port to its adapter in the service configuration; controllers live in infrastructure.

## Guardrails
- Nothing under `src/Domain/` imports Symfony, Doctrine or vendor SDK classes.
- Dependencies point inward: infrastructure knows the domain, never the reverse.
- Do not add the layers to a CRUD module with no business rules.
- Test the domain with plain unit tests and the adapters with integration tests.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The layer layout and the port interfaces.
- The adapters and their service bindings.
- Domain unit tests that boot no kernel.

## References
- `reference.md`
