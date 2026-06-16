# superpowers-symfony skills map

Short index for skill discovery without loading full files.

| Skill | Description | Tags | Path |
| --- | --- | --- | --- |
| `symfony:api-platform-dto-resources` | Map entities to API DTOs in API Platform v4 with the Symfony Object Mapper (#[Map], stateOptions) for decoupled input/output contracts | api-platform | `skills/api-platform-dto-resources/SKILL.md` |
| `symfony:api-platform-filters` | Implement API Platform filters - v4 Parameters API (QueryParameter) and legacy #[ApiFilter] - for search, date, range, boolean, and custom filtering | api-platform | `skills/api-platform-filters/SKILL.md` |
| `symfony:api-platform-resources` | Configure API Platform v4 resources with explicit operations, pagination, and typed OpenAPI for clean, versioned REST/GraphQL APIs | api-platform | `skills/api-platform-resources/SKILL.md` |
| `symfony:api-platform-security` | Secure API Platform resources with security expressions, voters, securityPostValidation, and operation-level access control | api-platform, security | `skills/api-platform-security/SKILL.md` |
| `symfony:api-platform-serialization` | Control API Platform serialization with groups, #[Context], IRI links (readableLink/writableLink), and custom context builders | api-platform | `skills/api-platform-serialization/SKILL.md` |
| `symfony:api-platform-state-providers` | Master API Platform v4 State Providers and Processors (ProviderInterface/ProcessorInterface) to decouple data retrieval and persistence from entities | api-platform | `skills/api-platform-state-providers/SKILL.md` |
| `symfony:api-platform-tests` | Test API Platform resources with ApiTestCase; assert collections, items, filters, JSON schema, and authentication | api-platform | `skills/api-platform-tests/SKILL.md` |
| `symfony:api-platform-versioning` | Evolve API Platform APIs via deprecation (deprecationReason/sunset, RFC 8594/9745), the recommended alternative to versioning; plus path/header strategies | api-platform | `skills/api-platform-versioning/SKILL.md` |
| `symfony:bootstrap-check` | Verify Symfony project configuration including .env, services.yaml, doctrine settings, and framework requirements |  | `skills/bootstrap-check/SKILL.md` |
| `symfony:brainstorming` | Structured brainstorming for Symfony projects - explore requirements, identify components, and plan architecture collaboratively |  | `skills/brainstorming/SKILL.md` |
| `symfony:config-env-parameters` | Manage Symfony configuration with .env files, parameters, secrets vault, and environment-specific settings | config | `skills/config-env-parameters/SKILL.md` |
| `symfony:controller-cleanup` | Refactor fat controllers into lean ones by extracting business logic to services, handlers, and invokable commands |  | `skills/controller-cleanup/SKILL.md` |
| `symfony:cqrs-and-handlers` | Implement CQRS in Symfony with separate Command and Query buses/handlers using the Messenger component |  | `skills/cqrs-and-handlers/SKILL.md` |
| `symfony:daily-workflow` | Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips |  | `skills/daily-workflow/SKILL.md` |
| `symfony:doctrine-batch-processing` | Process large datasets with Doctrine (ORM 3 toIterable, flush+clear, bulk DQL) and memory management | doctrine | `skills/doctrine-batch-processing/SKILL.md` |
| `symfony:doctrine-events` | React to Doctrine entity lifecycle in Symfony with attribute listeners (#[AsDoctrineListener]/#[AsEntityListener], ORM 3) and lifecycle callbacks | doctrine | `skills/doctrine-events/SKILL.md` |
| `symfony:doctrine-fetch-modes` | Optimize Doctrine fetching with DTO hydration (SELECT NEW; partial removed in ORM 3), lazy loading, query hints, and DBAL 4 access | doctrine | `skills/doctrine-fetch-modes/SKILL.md` |
| `symfony:doctrine-fixtures-foundry` | Create test data with Zenstruck Foundry v2 factories (PersistentObjectFactory, real objects); define states, sequences, and relationships | doctrine | `skills/doctrine-fixtures-foundry/SKILL.md` |
| `symfony:doctrine-migrations` | Create and manage Doctrine migrations (lib 4.x) for schema versioning; handle dependencies, rollbacks, and production deployment | doctrine | `skills/doctrine-migrations/SKILL.md` |
| `symfony:doctrine-relations` | Define Doctrine entity relationships (OneToMany, ManyToMany, ManyToOne); configure cascade, orphan removal, multiple entity managers; prevent N+1 queries | doctrine | `skills/doctrine-relations/SKILL.md` |
| `symfony:doctrine-transactions` | Handle Doctrine transactions (ORM 3 wrapInTransaction), optimistic/pessimistic locking, flush strategies, and transaction boundaries | doctrine | `skills/doctrine-transactions/SKILL.md` |
| `symfony:e2e-panther-playwright` | Write end-to-end tests with Symfony Panther 2.4 for browser automation or Playwright for complex scenarios |  | `skills/e2e-panther-playwright/SKILL.md` |
| `symfony:effective-context` | Provide effective context to Claude for Symfony development with relevant files, patterns, and constraints |  | `skills/effective-context/SKILL.md` |
| `symfony:executing-plans` | Methodically execute implementation plans with a TDD approach, incremental commits, and continuous validation |  | `skills/executing-plans/SKILL.md` |
| `symfony:form-types-validation` | Build Symfony forms with custom Form Types, validation constraints, HTTP 422 handling, and multi-step flows |  | `skills/form-types-validation/SKILL.md` |
| `symfony:functional-tests` | Write functional tests for Symfony controllers and HTTP endpoints using WebTestCase, getContainer, loginUser, and DAMA rollback |  | `skills/functional-tests/SKILL.md` |
| `symfony:interfaces-and-autowiring` | Master Symfony Dependency Injection with autowiring, #[Target] interface binding, decoration, and tagged services |  | `skills/interfaces-and-autowiring/SKILL.md` |
| `symfony:messenger-retry-failures` | Handle message failures with retry strategies, failure transport, and recovery in Symfony Messenger (Recoverable/Unrecoverable exceptions) | messenger | `skills/messenger-retry-failures/SKILL.md` |
| `symfony:ports-and-adapters` | Implement Hexagonal Architecture (Ports and Adapters) in Symfony; separate domain logic from infrastructure with clear boundaries |  | `skills/ports-and-adapters/SKILL.md` |
| `symfony:quality-checks` | Run code quality tools: PHP-CS-Fixer for style, PHPStan for static analysis, and type safety checks | quality | `skills/quality-checks/SKILL.md` |
| `symfony:rate-limiting` | Implement rate limiting with the Symfony RateLimiter (sliding window, token bucket, fixed window) and the #[RateLimit] controller attribute | security | `skills/rate-limiting/SKILL.md` |
| `symfony:runner-selection` | Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment |  | `skills/runner-selection/SKILL.md` |
| `symfony:strategy-pattern` | Implement the Strategy pattern with Symfony's tagged services for runtime algorithm selection and extensibility |  | `skills/strategy-pattern/SKILL.md` |
| `symfony:symfony-cache` | Implement caching with the Symfony Cache component; configure pools, use tags for invalidation, prevent stampede | cache | `skills/symfony-cache/SKILL.md` |
| `symfony:symfony-messenger` | Async message handling with Symfony Messenger; configure transports (RabbitMQ, Redis, Doctrine); implement handlers, middleware, and retry strategies | messenger | `skills/symfony-messenger/SKILL.md` |
| `symfony:symfony-scheduler` | Schedule recurring tasks with the Symfony Scheduler component (native since 7.x); define schedules, triggers, and integrate with Messenger |  | `skills/symfony-scheduler/SKILL.md` |
| `symfony:symfony-voters` | Implement granular authorization with Symfony Voters; decouple permission logic from controllers; test authorization separately | security | `skills/symfony-voters/SKILL.md` |
| `symfony:tdd-with-pest` | Apply RED-GREEN-REFACTOR with Pest v4 (PHP 8.3+) for Symfony via the PHPUnit bridge; Foundry factories, WebTestCase, verify failures first |  | `skills/tdd-with-pest/SKILL.md` |
| `symfony:tdd-with-phpunit` | Apply RED-GREEN-REFACTOR with PHPUnit 10/11 for Symfony; KernelTestCase/WebTestCase, attributes (#[Test]/#[DataProvider]), Foundry |  | `skills/tdd-with-phpunit/SKILL.md` |
| `symfony:test-doubles-mocking` | Create test doubles with PHPUnit mocks for isolated unit testing in Symfony |  | `skills/test-doubles-mocking/SKILL.md` |
| `symfony:twig-components` | Build reusable UI components with Symfony UX Twig Components (props, slots, anonymous components, CVA) for clean templates |  | `skills/twig-components/SKILL.md` |
| `symfony:using-symfony-superpowers` | Entry point for Symfony Superpowers - lightweight workflow guidance and command map |  | `skills/using-symfony-superpowers/SKILL.md` |
| `symfony:value-objects-and-dtos` | Design Value Objects for domain concepts and DTOs for data transfer with proper immutability (readonly) and validation |  | `skills/value-objects-and-dtos/SKILL.md` |
| `symfony:writing-plans` | Create structured implementation plans for Symfony features with clear steps, dependencies, and acceptance criteria |  | `skills/writing-plans/SKILL.md` |
