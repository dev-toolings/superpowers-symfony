# Symfony Documentation

Long-form framework documentation. Most of the depth lives in the skill library
itself: each skill under `content/skills/<name>/` ships a `reference.md` with the
implementation detail. This directory holds the few topics that are too broad to
belong to a single skill.

## In this directory

- [API Platform Overview](api-platform.md) — resource configuration, operations, and best practices
- [State Providers & Processors](state-providers-processors.md) — custom data retrieval and persistence
- [DTO Resources](dto-resources.md) — API design decoupled from entities

## In the skill library

| Topic | Skill reference |
|---|---|
| Entity relationships | [`doctrine-relations`](../../content/skills/doctrine-relations/reference.md) |
| Transactions and locking | [`doctrine-transactions`](../../content/skills/doctrine-transactions/reference.md) |
| Fetch modes and hydration | [`doctrine-fetch-modes`](../../content/skills/doctrine-fetch-modes/reference.md) |
| Batch processing | [`doctrine-batch-processing`](../../content/skills/doctrine-batch-processing/reference.md) |
| Async messaging | [`symfony-messenger`](../../content/skills/symfony-messenger/reference.md) |
| Authorization and voters | [`symfony-voters`](../../content/skills/symfony-voters/reference.md) |
| Caching | [`symfony-cache`](../../content/skills/symfony-cache/reference.md) |
| Ports & adapters | [`ports-and-adapters`](../../content/skills/ports-and-adapters/reference.md) |
| CQRS | [`cqrs-and-handlers`](../../content/skills/cqrs-and-handlers/reference.md) |
| Value objects and DTOs | [`value-objects-and-dtos`](../../content/skills/value-objects-and-dtos/reference.md) |
| TDD with Pest | [`tdd-with-pest`](../../content/skills/tdd-with-pest/reference.md) |
| TDD with PHPUnit | [`tdd-with-phpunit`](../../content/skills/tdd-with-phpunit/reference.md) |
| Functional tests | [`functional-tests`](../../content/skills/functional-tests/reference.md) |
| API tests | [`api-platform-tests`](../../content/skills/api-platform-tests/reference.md) |

The full index is in [`AGENTS.md`](../../AGENTS.md) and [`skills-map.md`](../../skills-map.md).

## Supported Versions

| Component | Versions |
|-----------|----------|
| Symfony | 7.4 LTS, 8.x (6.4 LTS as legacy) |
| API Platform | 4.x (3.x legacy) |
| Doctrine ORM | 3.x |
| PHP | 8.2, 8.3, 8.4 |

## Quick Links

- [Symfony Documentation](https://symfony.com/doc/current/index.html)
- [API Platform Documentation](https://api-platform.com/docs/)
- [Doctrine ORM Documentation](https://www.doctrine-project.org/projects/orm.html)
