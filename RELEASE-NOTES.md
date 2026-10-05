# Release Notes

## v0.3.0

### Changed
- **Every skill has a body of its own.** 43 of the 44 `SKILL.md` bodies were
  seven shared templates, so `## Use when` could not tell an agent which skill
  to load (#17). All 44 are now distinct, each drawn from its own
  `reference.md` (or, for the onboarding skills, from `bin/symfony-context`
  and the command map).
- **Validation commands per skill.** The `Skill Operating Checklist` appended
  to each `reference.md` carried the same design checklist and failure modes
  everywhere. Each file now ends with a `## Validation commands` section
  specific to its subject, read-only wherever possible.

### Fixed
- `strategy-pattern`: the export example used `#[TaggedLocator]`, removed in
  Symfony 8.0. It now uses `#[AutowireLocator]`.

### CI
- `bun run lint` fails when two skills share the same `## Use when` and
  `## Default workflow`, so a skill copied from a template cannot ship again.

## v0.2.2

### Fixed
- The `SessionStart` hook command now quotes `${CLAUDE_PLUGIN_ROOT}`. An
  installation path containing a space split the command into several words
  and the hook failed to start. `claude plugin validate` no longer warns.

## v0.2.1

### Fixed
- **Claude Code installation.** 0.2.0 failed with `agents: Invalid input`: the
  manifest declared `agents` as a directory, and Claude Code only accepts agent
  `.md` files there. The seven agents are now listed one by one, and the
  manifest no longer re-declares `hooks/hooks.json`, which Claude Code loads on
  its own (#13, #14).
- **Skill bodies on the wrong subject.** Ten skills carried a template body
  written for another topic. `symfony-cache` and `rate-limiting` (#15), then
  `doctrine-fixtures-foundry`, `doctrine-batch-processing`,
  `doctrine-transactions`, `form-types-validation`, `bootstrap-check`,
  `quality-checks`, `config-env-parameters` and `twig-components` now describe
  their own subject, drawn from their `reference.md`. Their validation commands
  no longer point at Messenger or Voters (#17).

### Changed
- `## References` no longer lists `docs/complexity-tiers.md`: a loaded skill
  resolves it beside its own `SKILL.md`, where it does not exist (#16).

### CI
- `bun run validate` now enforces the per-field manifest rules: `agents` entries
  are `.md` files, `skills` entries are directories, `hooks/hooks.json` is not
  re-declared, and every agent in `content/agents/` is listed.
- The `claude plugin validate` job is blocking and runs through `bunx`.

## v0.2.0

### Harness-agnostic

The library is no longer tied to a single agent. `content/` is now the single
source of truth — 44 skills, 7 agents, 13 commands in vendor-neutral Markdown —
and every per-harness packaging is generated from it by `bun run build` and
kept honest by a drift check in CI.

#### Added
- **`AGENTS.md`** — neutral index, read by Codex CLI, Grok Build, aider and others.
- **`bin/symfony-context`** — the environment detection extracted from the hook
  into a portable CLI, with `--format=json|markdown|env`.
- **`dist/`** — generated adapters for Codex CLI, OpenCode, Cursor, Windsurf,
  GitHub Copilot, Gemini CLI, aider, plus the `.agents/` layout used by Grok
  Build, and an installation matrix in `dist/README.md`.
- **`scripts/build.ts`** — one emitter per harness; `bun run check` fails when a
  generated file is stale.
- **`CONTRIBUTING.md`** and a relative-link check in CI.

#### Changed
- Skills, agents and commands moved to `content/`; Claude Code reads them
  through the component paths in `.claude-plugin/plugin.json`, so nothing is
  duplicated and the installation is unchanged for existing users.
- Skill frontmatter is now neutral: `capabilities` and `tags` are authored,
  `allowed-tools` is projected by the build. Agent `model` / `effort` /
  `maxTurns` / `memory` are authored in `x-claude-code` and projected likewise.
- Skill names lost the `symfony:` prefix. It was never the invocation identifier
  (which is `<plugin>:<directory>`) and it is rejected by OpenCode's name rules.
- Tooling moved from `npx tsx` to `bun`; `validate_skills.ts` became
  `validate.ts` and now validates the pivot rather than the Claude Code layout.
- `skills-map.md` and `skills-map-lite.md` are generated, which is what had let
  the lite index drift out of date.

#### Fixed
- **The SessionStart hook injected nothing.** It printed a bare JSON object;
  SessionStart parses valid JSON as structured hook output and rejects unknown
  keys, so the detection never reached the model. It now prints Markdown.
- **Docker was always reported as running** when Docker was installed:
  `docker compose ps` prints a header row, which the emptiness test matched.
  Consequence: host commands were wrongly prefixed with `docker compose exec`.
- **The test command ignored the detected framework** and always pointed at
  PHPUnit, even on a Pest project.
- **Four skill descriptions were silently truncated.** An unquoted YAML scalar
  ends at `" #"`, so `#[ApiFilter]`, `#[Context]`, `#[Target]` and `#[RateLimit]`
  cut their descriptions short for any real YAML parser. Validation now rejects
  the pattern.
- `marketplace.json` still pointed at `MakFly/superpowers-symfony` while the
  README installed from `dev-toolings/`.
- Version was 0.0.1 / 1.0.0 / v0.1.0 in three places; it now comes from
  `content/manifest.json` and is checked by validation.
- `docs/symfony/README.md` linked to 12 files that do not exist.
- The README listed 4 of the 7 agents; its tables are generated now.
- Dead variable `SKILL_DIR` removed from the detection script.

---

## v0.1.0 (2025-12-17)

### Initial Release

First public release of **superpowers-symfony**, a Symfony skill library for
coding agents.

#### Core Features
- **SessionStart Hook** - Auto-detection of Symfony applications, Docker environments, and test frameworks
- **44 Skills** - Coverage of Symfony patterns and best practices
- **13 Commands** - Entry points for common workflows
- **7 Agents** - Specialized role prompts

#### Skills Categories

**Testing (6 skills)**
- TDD with Pest PHP
- TDD with PHPUnit
- Functional tests with WebTestCase
- API Platform tests
- Test doubles and mocking
- E2E testing with Panther/Playwright

**Doctrine ORM (7 skills)**
- Entity relationships and mapping
- Migrations management
- Fixtures with Foundry
- Transactions and consistency
- Fetch modes optimization
- Batch processing
- Lifecycle events

**API Platform (8 skills)**
- Resources and operations
- Filters (search, date, range, boolean)
- Serialization and groups
- Security at operation level
- API versioning
- Testing API endpoints
- State Providers & Processors
- DTO-based Resources

**Symfony Core (8 skills)**
- Messenger and async processing
- Messenger retries and failures
- Voters for authorization
- Cache strategies
- Scheduler component
- Rate limiting
- Form types and validation
- Configuration and environment

**Architecture (6 skills)**
- CQRS and handlers
- Hexagonal architecture (Ports & Adapters)
- Strategy pattern with tagged services
- Interfaces and autowiring
- Value objects and DTOs
- Controller cleanup

**Workflow & quality (9 skills)**
- Quality checks (PHP-CS-Fixer, PHPStan)
- Twig components
- Entry point, runner selection, bootstrap check
- Daily workflow, effective context
- Brainstorming, writing plans, executing plans

#### Environment Detection

The `bin/symfony-context` CLI detects:
- Symfony application via `composer.json`
- Symfony version from `composer.lock`, falling back to `composer.json`
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

### Planned
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
