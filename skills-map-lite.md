# superpowers-symfony skills map (lite)

Lightweight index for fast discovery.

## Core
- `symfony:effective-context` — Provide effective context to Claude for Symfony development with relevant files, patterns, and constraints
- `symfony:bootstrap-check` — Verify Symfony project configuration including .env, services.yaml, doctrine settings, and framework requirements
- `symfony:daily-workflow` — Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips
- `symfony:runner-selection` — Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment
- `symfony:using-symfony-superpowers` — Entry point for Symfony Superpowers - lightweight workflow guidance and command map.

## Doctrine
- `symfony:doctrine-migrations` — Create and manage Doctrine migrations for schema versioning; handle migration dependencies, rollbacks, and production deployment
- `symfony:doctrine-batch-processing` — Process large datasets efficiently with Doctrine batch processing, iteration, and memory management
- `symfony:doctrine-fetch-modes` — Optimize Doctrine queries with fetch modes, lazy loading, extra lazy collections, and query hints for performance
- `symfony:doctrine-relations` — Define Doctrine entity relationships (OneToMany, ManyToMany, ManyToOne); configure fetch modes, cascade operations, and orphan removal; prevent N+1 queries
- `symfony:doctrine-fixtures-foundry` — Create test data with Foundry factories; define states, sequences, and relationships for realistic fixtures
- `symfony:doctrine-transactions` — Handle Doctrine transactions (ORM 3 wrapInTransaction); optimistic/pessimistic locking, flush strategies, and transaction boundaries
- `symfony:doctrine-events` — React to Doctrine entity lifecycle with attribute listeners (#[AsDoctrineListener]/#[AsEntityListener], ORM 3) and lifecycle callbacks

## API Platform
- `symfony:api-platform-filters` — Implement API Platform filters for search, date ranges, boolean, and custom filtering with proper indexing
- `symfony:api-platform-versioning` — Implement API versioning strategies in API Platform including URI, header, and query parameter approaches
- `symfony:api-platform-security` — Secure API Platform resources with security expressions, voters, and operation-level access control
- `symfony:api-platform-state-providers` — Master API Platform State Providers and Processors to decouple data retrieval and persistence from entities, enabling clean architecture and custom data sources
- `symfony:api-platform-tests` — Test API Platform resources with ApiTestCase, test collections, items, filters, and authentication
- `symfony:api-platform-resources` — Configure API Platform resources with operations, pagination, and output DTOs for clean, versioned REST/GraphQL APIs

## Messaging & Async
- `symfony:symfony-messenger` — Async message handling with Symfony Messenger; configure transports (RabbitMQ, Redis, Doctrine); implement handlers, middleware, and retry strategies
- `symfony:messenger-retry-failures` — Handle message failures with retry strategies, dead letter queues, and failure recovery in Symfony Messenger
- `symfony:symfony-scheduler` — Schedule recurring tasks with Symfony Scheduler component (7.1+); define schedules, triggers, and integrate with Messenger

## Security
- `symfony:rate-limiting` — Implement rate limiting with Symfony RateLimiter component; configure sliding window, token bucket, and fixed window algorithms
- `symfony:symfony-voters` — Implement granular authorization with Symfony Voters; decouple permission logic from controllers; test authorization separately from business logic

## Architecture
- `symfony:value-objects-and-dtos` — Design Value Objects for domain concepts and DTOs for data transfer with proper immutability and validation
- `symfony:strategy-pattern` — Implement the Strategy pattern with Symfony's tagged services for runtime algorithm selection and extensibility
- `symfony:cqrs-and-handlers` — Implement CQRS pattern in Symfony with separate Command and Query handlers using Messenger component
- `symfony:ports-and-adapters` — Implement Hexagonal Architecture (Ports and Adapters) in Symfony; separate domain logic from infrastructure with clear boundaries
- `symfony:interfaces-and-autowiring` — Master Symfony's Dependency Injection with autowiring, interface binding, service decoration, and tagged services for flexible architecture

## Testing
- `symfony:tdd-with-pest` — Apply RED-GREEN-REFACTOR with Pest PHP for Symfony; use Foundry factories, functional tests with WebTestCase, verify failures before implementation
- `symfony:e2e-panther-playwright` — Write end-to-end tests with Symfony Panther for browser automation or Playwright for complex scenarios
- `symfony:functional-tests` — Write functional tests for Symfony controllers and HTTP endpoints using WebTestCase, BrowserKit, and test clients
- `symfony:tdd-with-phpunit` — Apply RED-GREEN-REFACTOR with PHPUnit for Symfony; use KernelTestCase, WebTestCase, and Foundry for comprehensive testing
- `symfony:test-doubles-mocking` — Create test doubles with PHPUnit mocks and Prophecy for isolated unit testing in Symfony

## Quality
- `symfony:controller-cleanup` — Refactor fat controllers into lean controllers by extracting business logic to services, handlers, and dedicated classes
- `symfony:symfony-cache` — Implement caching with Symfony Cache component; configure pools, use cache tags for invalidation, and optimize performance
- `symfony:twig-components` — Build reusable UI components with Symfony UX Twig Components and Live Components for reactive interfaces
- `symfony:form-types-validation` — Build Symfony forms with custom Form Types, validation constraints, data transformers, and proper error handling
- `symfony:quality-checks` — Run code quality tools including PHP-CS-Fixer for style, PHPStan for static analysis, and Psalm for type safety
- `symfony:config-env-parameters` — Manage Symfony configuration with .env files, parameters, secrets, and environment-specific settings

## Other
- `symfony:writing-plans` — Create structured implementation plans for Symfony features with clear steps, dependencies, and acceptance criteria
- `symfony:brainstorming` — Structured brainstorming techniques for Symfony projects - explore requirements, identify components, and plan architecture collaboratively
- `symfony:executing-plans` — Methodically execute implementation plans with TDD approach, incremental commits, and continuous validation
