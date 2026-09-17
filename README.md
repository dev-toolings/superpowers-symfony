# Superpowers Symfony — a Symfony skill library for coding agents

> **Version-accurate Symfony expertise for AI coding agents.** 44 expert skills, 7 specialized agents and 13 commands covering **API Platform v4, Doctrine ORM 3, TDD with Pest & PHPUnit, Symfony Messenger, security/voters, and DDD / hexagonal architecture** — usable from Claude Code, Codex CLI, Grok Build, OpenCode, Cursor, Windsurf, GitHub Copilot, Gemini CLI, aider, or by hand.

![Symfony](https://img.shields.io/badge/Symfony-7.4_LTS_%7C_8.x-000000?logo=symfony&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.2–8.4-777BB4?logo=php&logoColor=white)
![API Platform](https://img.shields.io/badge/API_Platform-v4-38A9DB)
![AGENTS.md](https://img.shields.io/badge/AGENTS.md-supported-2ea44f)
![License: MIT](https://img.shields.io/github/license/dev-toolings/superpowers-symfony)

**Superpowers Symfony** gives coding agents deep, version-accurate **Symfony** expertise — from **Doctrine** schema design and **API Platform** REST/GraphQL APIs to **test-driven development**, async **Messenger** workflows, caching, rate limiting, and clean architecture. It targets **Symfony 7.4 LTS and 8.x** (6.4 LTS as legacy), **API Platform v4** (v3 legacy), and **Doctrine ORM 3** — so the guidance, signatures and code examples match the framework you actually run.

The content is deliberately vendor-neutral: skills are plain Markdown in the open
[Agent Skills](https://agentskills.io) layout, and the per-harness packaging is
generated from them.

## How it is organised

```
   content/        ← the source of truth: 44 skills, 7 agents, 13 commands
       │
       ├── read directly by ─────► Claude Code   (component paths in plugin.json)
       │                           OpenCode      (.opencode/skills → content/skills)
       │                           Grok Build    (.agents/skills   → content/skills)
       │
       └── bun run build ────────► AGENTS.md · skills-map.md · dist/**
                                   Codex · Cursor · Windsurf · Copilot · Gemini · aider
```

Nothing under `dist/` is written by hand, and CI fails if it drifts from `content/`.

## Installation

<!-- BEGIN install -->
| Harness | Mechanism | How |
|---|---|---|
| **Claude Code** | plugin marketplace | `/plugin marketplace add dev-toolings/superpowers-symfony` then `/plugin install superpowers-symfony@superpowers-symfony` |
| **Codex CLI** | `AGENTS.md` + prompts | copy `AGENTS.md` into your project, `cp dist/codex/prompts/*.md ~/.codex/prompts/` |
| **Grok Build** | `AGENTS.md` + `.agents/` | copy `AGENTS.md`, then `ln -s "$PWD/content/skills" .agents/skills` and `cp -R dist/agents/commands .agents/commands` — then **trust the folder** (see below) |
| **OpenCode** | native skills + agents | `ln -s "$PWD/content/skills" .opencode/skills`, `cp -R dist/opencode/agent .opencode/agent` |
| **Cursor** | rules | `cp dist/cursor/rules/*.mdc .cursor/rules/` |
| **Windsurf** | rules | `cp dist/windsurf/rules/*.md .windsurf/rules/` |
| **GitHub Copilot** | instructions + custom agents | `cp dist/copilot/copilot-instructions.md .github/`, `cp dist/copilot/instructions/*.md .github/instructions/`, `cp dist/copilot/agents/*.agent.md .github/agents/` |
| **Gemini CLI** | `GEMINI.md` + commands | `cp dist/gemini/GEMINI.md .`, `cp -R dist/gemini/commands/symfony ~/.gemini/commands/` |
| **aider** | conventions | `cp dist/aider/CONVENTIONS.md AGENTS.md .`, `cp dist/aider/.aider.conf.yml .` |
| **Anything else** | manual | copy `AGENTS.md`; it routes to the right `content/skills/<name>/SKILL.md` |
<!-- END install -->

Full per-harness instructions: [`dist/README.md`](dist/README.md).

**Grok Build trusts nothing by default.** Until you accept the trust prompt for a
directory, it loads neither project instructions nor project skills — `grok inspect`
reports `Project trusted: no` and simply lists none of them. Run `grok` once in the
project, accept, then confirm with `grok inspect`.

### Verified

| Harness | Check | Result |
|---|---|---|
| Claude Code | `claude plugin details` | 44 skills · 7 agents · 13 commands · SessionStart hook |
| Grok Build | `grok inspect` + one-shot prompt | 44/44 skills via `.agents/skills`, `AGENTS.md` loaded, routed correctly |
| OpenCode | `opencode debug skill` / `agent list` | 44/44 skills, 7/7 agents as subagents |
| Codex CLI | `codex exec` one-shot prompt | `AGENTS.md` loaded, routed correctly |


Grok Code Fast and similar hosted models inherit whatever format their host
harness uses — nothing specific to install for them.

### Claude Code, project-scoped

```json
{
  "extraKnownMarketplaces": {
    "superpowers-symfony": {
      "source": { "source": "github", "repo": "dev-toolings/superpowers-symfony" }
    }
  },
  "enabledPlugins": { "superpowers-symfony@superpowers-symfony": true }
}
```

## Runtime detection

`bin/symfony-context` detects the Symfony version, API Platform, the Docker setup
(Symfony Docker / DDEV / Compose / host) and the test framework, then prints the
correctly prefixed `bin/console`, `composer` and test commands.

```bash
./bin/symfony-context                    # JSON
./bin/symfony-context --format=markdown  # a context block for any agent
./bin/symfony-context --format=env       # for scripts and CI
```

Claude Code runs it automatically at session start. Other harnesses are told to
run it first by `AGENTS.md` and by the generated rule indexes.

## Skills

<!-- BEGIN skills -->
#### API Platform

| Skill | Description |
| --- | --- |
| `api-platform-dto-resources` | Map entities to API DTOs in API Platform v4 with the Symfony Object Mapper (#[Map], stateOptions) for decoupled input/output contracts |
| `api-platform-filters` | Implement API Platform filters - v4 Parameters API (QueryParameter) and legacy #[ApiFilter] - for search, date, range, boolean, and custom filtering |
| `api-platform-resources` | Configure API Platform v4 resources with explicit operations, pagination, and typed OpenAPI for clean, versioned REST/GraphQL APIs |
| `api-platform-security` | Secure API Platform resources with security expressions, voters, securityPostValidation, and operation-level access control |
| `api-platform-serialization` | Control API Platform serialization with groups, #[Context], IRI links (readableLink/writableLink), and custom context builders |
| `api-platform-state-providers` | Master API Platform v4 State Providers and Processors (ProviderInterface/ProcessorInterface) to decouple data retrieval and persistence from entities |
| `api-platform-tests` | Test API Platform resources with ApiTestCase; assert collections, items, filters, JSON schema, and authentication |
| `api-platform-versioning` | Evolve API Platform APIs via deprecation (deprecationReason/sunset, RFC 8594/9745), the recommended alternative to versioning; plus path/header strategies |

#### Doctrine ORM

| Skill | Description |
| --- | --- |
| `doctrine-batch-processing` | Process large datasets with Doctrine (ORM 3 toIterable, flush+clear, bulk DQL) and memory management |
| `doctrine-events` | React to Doctrine entity lifecycle in Symfony with attribute listeners (#[AsDoctrineListener]/#[AsEntityListener], ORM 3) and lifecycle callbacks |
| `doctrine-fetch-modes` | Optimize Doctrine fetching with DTO hydration (SELECT NEW; partial removed in ORM 3), lazy loading, query hints, and DBAL 4 access |
| `doctrine-fixtures-foundry` | Create test data with Zenstruck Foundry v2 factories (PersistentObjectFactory, real objects); define states, sequences, and relationships |
| `doctrine-migrations` | Create and manage Doctrine migrations (lib 4.x) for schema versioning; handle dependencies, rollbacks, and production deployment |
| `doctrine-relations` | Define Doctrine entity relationships (OneToMany, ManyToMany, ManyToOne); configure cascade, orphan removal, multiple entity managers; prevent N+1 queries |
| `doctrine-transactions` | Handle Doctrine transactions (ORM 3 wrapInTransaction), optimistic/pessimistic locking, flush strategies, and transaction boundaries |

#### Tests & TDD

| Skill | Description |
| --- | --- |
| `api-platform-tests` | Test API Platform resources with ApiTestCase; assert collections, items, filters, JSON schema, and authentication |
| `doctrine-fixtures-foundry` | Create test data with Zenstruck Foundry v2 factories (PersistentObjectFactory, real objects); define states, sequences, and relationships |
| `e2e-panther-playwright` | Write end-to-end tests with Symfony Panther 2.4 for browser automation or Playwright for complex scenarios |
| `functional-tests` | Write functional tests for Symfony controllers and HTTP endpoints using WebTestCase, getContainer, loginUser, and DAMA rollback |
| `tdd-with-pest` | Apply RED-GREEN-REFACTOR with Pest v4 (PHP 8.3+) for Symfony via the PHPUnit bridge; Foundry factories, WebTestCase, verify failures first |
| `tdd-with-phpunit` | Apply RED-GREEN-REFACTOR with PHPUnit 10/11 for Symfony; KernelTestCase/WebTestCase, attributes (#[Test]/#[DataProvider]), Foundry |
| `test-doubles-mocking` | Create test doubles with PHPUnit mocks for isolated unit testing in Symfony |

#### Messenger & async

| Skill | Description |
| --- | --- |
| `cqrs-and-handlers` | Implement CQRS in Symfony with separate Command and Query buses/handlers using the Messenger component |
| `messenger-retry-failures` | Handle message failures with retry strategies, failure transport, and recovery in Symfony Messenger (Recoverable/Unrecoverable exceptions) |
| `symfony-messenger` | Async message handling with Symfony Messenger; configure transports (RabbitMQ, Redis, Doctrine); implement handlers, middleware, and retry strategies |
| `symfony-scheduler` | Schedule recurring tasks with the Symfony Scheduler component (native since 7.x); define schedules, triggers, and integrate with Messenger |

#### Security

| Skill | Description |
| --- | --- |
| `api-platform-security` | Secure API Platform resources with security expressions, voters, securityPostValidation, and operation-level access control |
| `form-types-validation` | Build Symfony forms with custom Form Types, validation constraints, HTTP 422 handling, and multi-step flows |
| `rate-limiting` | Implement rate limiting with the Symfony RateLimiter (sliding window, token bucket, fixed window) and the #[RateLimit] controller attribute |
| `symfony-voters` | Implement granular authorization with Symfony Voters; decouple permission logic from controllers; test authorization separately |

#### Architecture & services

| Skill | Description |
| --- | --- |
| `config-env-parameters` | Manage Symfony configuration with .env files, parameters, secrets vault, and environment-specific settings |
| `controller-cleanup` | Refactor fat controllers into lean ones by extracting business logic to services, handlers, and invokable commands |
| `cqrs-and-handlers` | Implement CQRS in Symfony with separate Command and Query buses/handlers using the Messenger component |
| `interfaces-and-autowiring` | Master Symfony Dependency Injection with autowiring, #[Target] interface binding, decoration, and tagged services |
| `ports-and-adapters` | Implement Hexagonal Architecture (Ports and Adapters) in Symfony; separate domain logic from infrastructure with clear boundaries |
| `strategy-pattern` | Implement the Strategy pattern with Symfony's tagged services for runtime algorithm selection and extensibility |
| `symfony-cache` | Implement caching with the Symfony Cache component; configure pools, use tags for invalidation, prevent stampede |
| `twig-components` | Build reusable UI components with Symfony UX Twig Components (props, slots, anonymous components, CVA) for clean templates |
| `value-objects-and-dtos` | Design Value Objects for domain concepts and DTOs for data transfer with proper immutability (readonly) and validation |

#### Workflow & onboarding

| Skill | Description |
| --- | --- |
| `bootstrap-check` | Verify Symfony project configuration including .env, services.yaml, doctrine settings, and framework requirements |
| `brainstorming` | Structured brainstorming for Symfony projects - explore requirements, identify components, and plan architecture collaboratively |
| `daily-workflow` | Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips |
| `effective-context` | Provide effective context to the coding agent for Symfony development with relevant files, patterns, and constraints |
| `executing-plans` | Methodically execute implementation plans with a TDD approach, incremental commits, and continuous validation |
| `quality-checks` | Run code quality tools: PHP-CS-Fixer for style, PHPStan for static analysis, and type safety checks |
| `runner-selection` | Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment |
| `using-symfony-superpowers` | Entry point for Symfony Superpowers - lightweight workflow guidance and command map |
| `writing-plans` | Create structured implementation plans for Symfony features with clear steps, dependencies, and acceptance criteria |
<!-- END skills -->

## Agents

<!-- BEGIN agents -->
| Agent | Mode | Description |
| --- | --- | --- |
| `api-platform-builder` | implement | Creates and configures API Platform resources with operations, DTOs, state providers, processors, and security. Handles full resource scaffolding from entity to tested API endpoint. Use for building APIs, creating resources, or configuring API Platform. |
| `doctrine-architect` | analyze | Designs Doctrine entity schemas, relationships, and migration strategies. Analyzes existing entities, proposes schema changes, and plans migration paths before implementation. Use for entity design, relationship modeling, or migration planning. |
| `doctrine-performance-optimizer` | review | Read-only performance audit of Doctrine usage: N+1 queries, fetch modes, batch processing, missing indexes, and caching opportunities. Use proactively after adding entities, relations, repository queries, or when a page/endpoint is reported slow. |
| `symfony-engineer` | implement | Implements Symfony application code following framework best practices, drawing on the superpowers-symfony skill library. Use for general Symfony coding — controllers, services, dependency injection, value objects/DTOs, forms, Twig components, configuration — when no more specialized agent (api-platform-builder, doctrine-architect, symfony-tdd-coach) fits better. |
| `symfony-reviewer` | review | Reviews Symfony code for quality, architecture, and best practices. Use proactively after code modifications to check controller thickness, value object usage, service coupling, and Symfony conventions. Triggers on code review, quality audit, or architecture check requests. |
| `symfony-security-auditor` | review | Read-only security audit of Symfony authentication and authorization: firewalls, access_control, voters, API Platform security, rate limiting, CSRF, password hashing, and input validation. Use proactively after changes to security.yaml, voters, controllers, forms, or API resources. |
| `symfony-tdd-coach` | implement | Guides TDD workflow for Symfony projects using Pest PHP or PHPUnit. Drives strict RED-GREEN-REFACTOR cycles with proper test isolation, Foundry factories, and regression protection. Use when writing tests, adding test coverage, or practicing TDD. |
<!-- END agents -->

Read-only agents (`review`, `analyze`) never modify files; they report.

## Commands

<!-- BEGIN commands -->
| Command | Description | Skill |
| --- | --- | --- |
| `/brainstorm` | Start a structured brainstorming session for Symfony project features and architecture | `brainstorming` |
| `/execute-plan` | Execute an implementation plan methodically with TDD and continuous validation | `executing-plans` |
| `/symfony-api-resources` | Configure API Platform resources with operations and pagination | `api-platform-resources` |
| `/symfony-cache` | Implement caching strategies using Symfony Cache component | `symfony-cache` |
| `/symfony-check` | Run all quality checks (PHP-CS-Fixer, PHPStan, tests) on the Symfony project | `quality-checks` |
| `/symfony-doctrine-relations` | Guide for implementing Doctrine entity relationships (OneToMany, ManyToMany) | `doctrine-relations` |
| `/symfony-fixtures` | Create test fixtures using Foundry factories for realistic test data | `doctrine-fixtures-foundry` |
| `/symfony-messenger` | Implement async message handling with Symfony Messenger | `symfony-messenger` |
| `/symfony-migrations` | Create and manage Doctrine migrations for database schema changes | `doctrine-migrations` |
| `/symfony-tdd-pest` | Start a TDD workflow using Pest PHP for Symfony with RED-GREEN-REFACTOR cycle | `tdd-with-pest` |
| `/symfony-tdd-phpunit` | Start a TDD workflow using PHPUnit for Symfony with RED-GREEN-REFACTOR cycle | `tdd-with-phpunit` |
| `/symfony-voters` | Implement authorization logic using Symfony Voters | `symfony-voters` |
| `/write-plan` | Create a structured implementation plan for a Symfony feature | `writing-plans` |
<!-- END commands -->

## Supported versions

| Component | Version | Status |
|---|---|---|
| Symfony | 8.1 / 8.0 | Supported |
| Symfony | 7.4 LTS | Supported (current LTS) |
| Symfony | 6.4 LTS | Legacy (bugfix EOL 11/2026) |
| API Platform | 4.x | Supported |
| API Platform | 3.x | Legacy |
| Doctrine ORM | 3.x | Supported |
| PHP | 8.2 – 8.4 | Supported |

## Docker support

| Setup | Detection |
|---|---|
| **Symfony Docker (FrankenPHP)** | `compose.yaml` with `frankenphp` / `caddy` |
| **DDEV** | `.ddev/` directory |
| **Docker Compose** | `compose.yaml` / `docker-compose.yml` |
| **Host** | fallback when no Docker is detected |

## Repository layout

```
superpowers-symfony/
├── content/                  # SOURCE OF TRUTH
│   ├── manifest.json         #   namespace, version, tag groups and their globs
│   ├── skills/<name>/        #   44 skills: SKILL.md (+ reference.md)
│   ├── agents/               #   7 agents
│   └── commands/             #   13 commands
├── bin/symfony-context       # portable environment detection
├── scripts/
│   ├── build.ts              #   content/ -> every harness adapter
│   ├── validate.ts           #   pivot, artifacts, packaging
│   ├── pivot.ts              #   the typed model
│   └── emitters/             #   one file per harness
├── dist/                     # GENERATED — never edit
├── AGENTS.md                 # GENERATED — the neutral index
├── skills-map*.md            # GENERATED
├── .claude-plugin/           # Claude Code packaging (points at content/)
├── hooks/                    # Claude Code SessionStart wrapper
└── docs/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: edit `content/`, run
`bun run build`, run `bun run test`, commit the generated files.

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

Inspired by [superpowers-laravel](https://github.com/jpcaparas/superpowers-laravel) by JP Caparas.

## Support

- Issues: [GitHub Issues](https://github.com/dev-toolings/superpowers-symfony/issues)
- Discussions: [GitHub Discussions](https://github.com/dev-toolings/superpowers-symfony/discussions)

---

<sub>**Keywords:** Symfony, agent skills, AGENTS.md, AI coding agent, Claude Code plugin, Codex CLI, Grok Build, OpenCode, Cursor rules, Windsurf rules, GitHub Copilot instructions, Gemini CLI, aider, API Platform, Doctrine ORM, PHP 8, TDD, Pest, PHPUnit, Symfony Messenger, Scheduler, CQRS, hexagonal architecture, ports and adapters, DDD, value objects, DTO, voters, rate limiting, Twig components, Foundry, Panther, FrankenPHP, Symfony Docker, DDEV.</sub>
