# Doctrine Migrations Reference (Symfony)

Use this reference for implementation details and review criteria specific to `doctrine-migrations`.

Versions (target): **DoctrineMigrationsBundle `^3.0`**, which wraps the
**`doctrine/migrations` library 4.0.x** (5.0 in development). Migration classes
use the typed, `void`-returning signatures `up(Schema $schema): void` /
`down(Schema $schema): void`.

## Install

```bash
composer require doctrine/doctrine-migrations-bundle "^3.0"
```

## Typical workflow

```bash
# 1. Change your entity mapping (#[ORM\...]), then generate the diff
php bin/console make:migration            # MakerBundle wrapper around diff
# or:
php bin/console doctrine:migrations:diff

# 2. Review the generated up()/down() SQL (NEVER trust the diff blindly)

# 3. Apply
php bin/console doctrine:migrations:migrate

# Useful neighbours
php bin/console doctrine:migrations:status
php bin/console doctrine:migrations:migrate prev    # roll back one version
php bin/console doctrine:migrations:execute 'DoctrineMigrations\Version20260617120000' --down
```

## Migration class

```php
<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add status column to product';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD status VARCHAR(20) NOT NULL DEFAULT \'draft\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP status');
    }
}
```

`down()` must reverse `up()`. A migration without a real `down()` cannot be
rolled back safely — write it even when it feels redundant.

## Configuration (`config/packages/doctrine_migrations.yaml`)

```yaml
doctrine_migrations:
    migrations_paths:
        'DoctrineMigrations': '%kernel.project_dir%/migrations'
    enable_profiler: false

    # Wrap EACH migration in its own transaction (default true).
    transactional: true
    # Run ALL pending migrations inside ONE transaction (default false).
    # On MySQL most DDL is non-transactional (implicit commit), so this is
    # mainly effective on PostgreSQL.
    all_or_nothing: false

    check_database_platform: true
    organize_migrations: false   # or BY_YEAR / BY_YEAR_AND_MONTH
```

Key options:

| Option | Default | Purpose |
|--------|---------|---------|
| `migrations_paths` | — | namespace → path pairs (required) |
| `transactional` | `true` | wrap each migration in a transaction |
| `all_or_nothing` | `false` | run all pending migrations in one transaction |
| `em` | `default` | entity manager (overrides `connection`) |
| `check_database_platform` | `true` | verify the DB type matches |
| `enable_service_migrations` | `false` | allow migrations to be fetched from the container (DI) |

## Multiple entity managers

Each EM has its own migration history. Pass `--em` to every command:

```bash
php bin/console doctrine:migrations:diff    --em=customer
php bin/console doctrine:migrations:migrate  --em=customer
```

When you have a non-default EM, also set `em:` (or a dedicated path) in
`doctrine_migrations.yaml`, and in prod redefine the default EM in
`config/packages/prod/doctrine.yaml`.

## Best practices

1. **Review the diff before applying.** `diff` reflects mapping vs current DB;
   it can emit destructive or surprising DDL (renames seen as drop+add, index
   churn). Read every `addSql()` line.
2. **Schema only — no data migrations in schema migrations.** Mixing data
   changes into a `diff`-generated migration breaks reversibility and gets
   clobbered on the next `diff`. For data, use a dedicated, hand-written
   migration or a one-off command, and keep it idempotent.
3. **Always write `down()`** so the change is reversible.
4. **One concern per migration.** Easier to review, revert, and reason about.
5. **Never edit an already-applied migration.** Add a new one instead.
6. **Service migrations** (`enable_service_migrations: true`) when a migration
   genuinely needs a service — tag it `doctrine_migrations.migration` and call
   `parent::__construct($connection, $logger)`.

## Applicability

- **Target**: bundle `^3.0` + library 4.0.x, typed `up/down(Schema): void`.
- The signatures and `transactional`/`all_or_nothing` options shown apply to
  library 3.x and 4.x alike.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console doctrine:migrations:diff
- php bin/console doctrine:migrations:migrate
- ./vendor/bin/phpunit --filter=Doctrine

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.
