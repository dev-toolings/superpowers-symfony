# Release Notes

## v0.1.0 (2025-12-17)

### Initial Release

First public release of **superpowers-symfony**, a comprehensive Claude Code plugin for Symfony development.

#### Core Features
- **SessionStart Hook** - Auto-detection of Symfony applications, Docker environments, and test frameworks
- **47 Skills** - Comprehensive coverage of Symfony patterns and best practices
- **13 Commands** - Interactive prompts for common workflows

#### Skills Categories

**Testing (5 skills)**
- TDD with Pest PHP
- TDD with PHPUnit
- Functional tests with WebTestCase
- Test doubles and mocking
- E2E testing with Panther/Playwright

**Doctrine ORM (8 skills)**
- Entity relationships and mapping
- Migrations management
- Fixtures with Foundry
- Transactions and consistency
- Fetch modes optimization
- Batch processing
- Query builder patterns
- Extensions (Gedmo, etc.)

**API Platform (8 skills)**
- Resources and operations
- Filters (search, date, range, boolean)
- Serialization and groups
- Security at operation level
- API versioning
- Testing API endpoints
- **NEW: State Providers & Processors**
- **NEW: DTO-based Resources**

**Symfony Core (9 skills)**
- Messenger and async processing
- Voters for authorization
- Cache strategies
- Scheduler component
- Rate limiting
- Form types and validation
- Configuration and environment
- Prompting patterns
- Quality checks (PHP-CS-Fixer, PHPStan)

**Architecture (7 skills)**
- CQRS and handlers
- Hexagonal architecture (Ports & Adapters)
- Strategy pattern with tagged services
- Interfaces and autowiring
- Value objects and DTOs
- Controller cleanup
- Effective context for AI

**Frontend (3 skills)**
- Twig components
- Twig extensions
- Asset Mapper / Encore

#### Environment Detection

The `session-start.sh` hook automatically detects:
- Symfony application via `composer.json`
- Symfony version from `composer.lock`
- API Platform installation and version
- Docker setup (Symfony Docker/FrankenPHP, Docker Compose standard, host)
- Test framework (PHPUnit vs Pest)

#### Supported Versions

| Framework | Version | Status |
|-----------|---------|--------|
| Symfony | 8.1 (stable) | Fully supported |
| Symfony | 8.0 | Fully supported |
| Symfony | 7.4 LTS | Fully supported (current LTS) |
| Symfony | 6.4 LTS | Supported (legacy, EOL bugfix 11/2026) |
| API Platform | 4.x | Fully supported |
| API Platform | 3.x | Supported (legacy) |

---

## Upcoming

### Planned for v0.2.0
- Workflow component skill (state machines)
- Lock component skill
- Mailer component skill
- Enhanced monorepo support
- Performance profiling skill

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new skills.

## License

MIT License - see [LICENSE](LICENSE) for details.
