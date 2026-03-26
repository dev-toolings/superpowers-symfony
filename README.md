# Superpowers Symfony

A Claude Code plugin providing Symfony-specific guidance, skills, workflows, and specialized subagents. Enhances your development experience with TDD support, Doctrine guidance, API Platform patterns, and best practices for Symfony 6.4 LTS, 7.x, and 8.0.

## Features

- **Specialized Agents** - 4 subagents with skill preloading and project memory
- **TDD Workflows** - RED-GREEN-REFACTOR with Pest PHP or PHPUnit
- **Doctrine Mastery** - Relations, migrations, transactions, Foundry fixtures
- **API Platform** - Resources, filters, serialization, versioning, DTOs
- **Symfony Messenger** - Async processing, handlers, retry strategies
- **Security** - Voters, rate limiting, form validation
- **Architecture** - Hexagonal/Ports & Adapters, CQRS, DI patterns
- **Quality** - PHP-CS-Fixer, PHPStan integration
- **Docker Support** - Docker Compose, Symfony Docker (FrankenPHP), DDEV
- **Auto-detection** - Detects Symfony version, API Platform, Docker setup, and test framework at session start

## Installation

### From the marketplace (recommended)

```bash
# Add the marketplace
/plugin marketplace add MakFly/superpowers-symfony

# Install the plugin
/plugin install superpowers-symfony@superpowers-symfony
```

### For your team (project-scoped)

Add to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "superpowers-symfony": {
      "source": {
        "source": "github",
        "repo": "MakFly/superpowers-symfony"
      }
    }
  },
  "enabledPlugins": {
    "superpowers-symfony@superpowers-symfony": true
  }
}
```

## Usage

Once installed, skills and commands are available automatically. Claude can invoke them based on task context, or you can call them explicitly.

### Skills (invoke with `/skill-name`)

```
/symfony:tdd-with-pest
/symfony:doctrine-relations
/symfony:api-platform-dto-resources
```

### Slash commands

```
/brainstorm
/write-plan
/execute-plan
/symfony-check
```

## Available Skills

### Onboarding & Configuration

| Skill | Description |
|-------|-------------|
| `using-symfony-superpowers` | Entry point and overview |
| `runner-selection` | Docker vs Host environment detection |
| `bootstrap-check` | Project verification and setup |
| `daily-workflow` | Daily development workflow |
| `effective-context` | Context management best practices |

### Testing

| Skill | Description |
|-------|-------------|
| `tdd-with-pest` | TDD workflow with Pest PHP |
| `tdd-with-phpunit` | TDD workflow with PHPUnit |
| `functional-tests` | WebTestCase for HTTP testing |
| `api-platform-tests` | API Platform test utilities |
| `test-doubles-mocking` | Mocks, stubs, and fakes |
| `e2e-panther-playwright` | End-to-end browser testing |

### Doctrine ORM

| Skill | Description |
|-------|-------------|
| `doctrine-relations` | Entity relationships (1:1, 1:N, N:N) |
| `doctrine-migrations` | Schema versioning |
| `doctrine-fixtures-foundry` | Test data factories with Foundry |
| `doctrine-transactions` | Transaction handling |
| `doctrine-batch-processing` | Bulk operations |
| `doctrine-fetch-modes` | Performance optimization |

### API Platform

| Skill | Description |
|-------|-------------|
| `api-platform-resources` | Resource configuration |
| `api-platform-filters` | Search and filtering |
| `api-platform-serialization` | Serialization groups |
| `api-platform-state-providers` | Custom State Providers & Processors |
| `api-platform-dto-resources` | DTO-based API Resources |
| `api-platform-security` | API security patterns |
| `api-platform-versioning` | API versioning strategies |

### Messenger & Async

| Skill | Description |
|-------|-------------|
| `symfony-messenger` | Message handling basics |
| `messenger-retry-failures` | Error handling and retries |
| `symfony-scheduler` | Scheduled tasks |

### Security

| Skill | Description |
|-------|-------------|
| `symfony-voters` | Authorization logic |
| `form-types-validation` | Form and validation |
| `rate-limiting` | Rate limiter configuration |

### Architecture

| Skill | Description |
|-------|-------------|
| `interfaces-and-autowiring` | Dependency injection |
| `ports-and-adapters` | Hexagonal architecture |
| `strategy-pattern` | Tagged services pattern |
| `cqrs-and-handlers` | Command/Query separation |
| `value-objects-and-dtos` | Value objects design |
| `config-env-parameters` | Environment configuration |

### Quality & Performance

| Skill | Description |
|-------|-------------|
| `quality-checks` | PHP-CS-Fixer, PHPStan |
| `symfony-cache` | Caching strategies |
| `controller-cleanup` | Thin controllers pattern |
| `twig-components` | Twig component patterns |

### Planning & Workflow

| Skill | Description |
|-------|-------------|
| `brainstorming` | Structured brainstorming sessions |
| `writing-plans` | Implementation planning |
| `executing-plans` | Plan execution with checkpoints |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/brainstorm` | Start a brainstorming session |
| `/write-plan` | Create an implementation plan |
| `/execute-plan` | Execute plan with TDD |
| `/symfony-check` | Run quality checks |
| `/symfony-tdd-pest` | TDD workflow with Pest |
| `/symfony-tdd-phpunit` | TDD workflow with PHPUnit |
| `/symfony-migrations` | Doctrine migrations helper |
| `/symfony-fixtures` | Generate test fixtures |
| `/symfony-doctrine-relations` | Design entity relations |
| `/symfony-api-resources` | Create API resources |
| `/symfony-voters` | Implement authorization |
| `/symfony-messenger` | Setup async messaging |
| `/symfony-cache` | Configure caching |

## Agents

Specialized subagents that Claude auto-delegates to based on task context. Each agent has skill preloading and project-scoped memory that persists across sessions.

| Agent | Description | Model | Mode |
|-------|-------------|-------|------|
| `symfony-reviewer` | Code review for Symfony quality, architecture, and best practices | Sonnet | Read-only |
| `symfony-tdd-coach` | TDD workflow with strict RED-GREEN-REFACTOR cycles | Inherit | Read/Write |
| `doctrine-architect` | Entity design, relationship modeling, and migration planning | Inherit | Read-only (proposes) |
| `api-platform-builder` | API resource scaffolding with DTOs, providers, and security | Inherit | Read/Write |

Claude invokes agents automatically based on your task. You can also reference them explicitly:

```
@agent-symfony-reviewer look at my recent changes
@agent-symfony-tdd-coach help me write tests for UserService
@agent-doctrine-architect design entities for an e-commerce app
@agent-api-platform-builder create a Product API resource
```

## Supported Versions

| Framework | Version | Status |
|-----------|---------|--------|
| Symfony | 6.4 LTS | Supported |
| Symfony | 7.x | Supported |
| Symfony | 8.0 | Supported |
| API Platform | 3.x | Supported |
| API Platform | 4.x | Supported |

## Docker Support

The plugin automatically detects your Docker setup at session start:

| Setup | Detection |
|-------|-----------|
| **Symfony Docker (FrankenPHP)** | `compose.yaml` with `frankenphp`/`caddy` |
| **DDEV** | `.ddev/` directory |
| **Docker Compose** | `compose.yaml` / `docker-compose.yml` |
| **Host** | Fallback when no Docker detected |

Commands (`bin/console`, `composer`, tests) are automatically prefixed with the correct Docker exec wrapper.

## Project Structure

```
superpowers-symfony/
├── .claude-plugin/
│   ├── marketplace.json      # Marketplace catalog
│   └── plugin.json           # Plugin manifest
├── agents/                   # 4 specialized subagents
│   ├── symfony-reviewer.md
│   ├── symfony-tdd-coach.md
│   ├── doctrine-architect.md
│   └── api-platform-builder.md
├── skills/                   # 43 skill definitions
│   ├── tdd-with-pest/
│   │   └── SKILL.md
│   ├── doctrine-relations/
│   │   ├── SKILL.md
│   │   └── reference.md
│   └── ...
├── commands/                 # 13 slash commands
│   ├── brainstorm.md
│   ├── write-plan.md
│   └── ...
├── hooks/
│   ├── hooks.json            # SessionStart hook config
│   └── session-start.sh      # Auto-detection script
├── docs/                     # Additional documentation
├── scripts/                  # Validation scripts
├── LICENSE
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add/modify skills in `skills/` directory
4. Validate: `claude plugin validate .`
5. Submit a pull request

### Skill format

Each skill is a directory with a `SKILL.md` file:

```markdown
---
name: symfony:skill-name
description: Brief description of the skill
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Skill content with code examples, best practices, etc.
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by [superpowers-laravel](https://github.com/jpcaparas/superpowers-laravel) by JP Caparas.

## Support

- Issues: [GitHub Issues](https://github.com/MakFly/superpowers-symfony/issues)
- Discussions: [GitHub Discussions](https://github.com/MakFly/superpowers-symfony/discussions)
