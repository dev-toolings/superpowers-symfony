# Reference

# Daily Symfony Development Workflow

## Starting Your Day

### 1. Update Dependencies (if needed)

```bash
# Pull latest code
git pull origin main

# Update dependencies
composer install

# Run migrations
bin/console doctrine:migrations:migrate --no-interaction

# Clear cache
bin/console cache:clear
```

### 2. Start Services

```bash
# Docker Compose
docker compose up -d

# Or Symfony Docker
docker compose up -d --wait

# Start Symfony server (if not using Docker)
symfony server:start -d
```

### 3. Check Status

```bash
# Verify database connection
bin/console doctrine:query:sql "SELECT 1"

# Check messenger transports
bin/console messenger:stats

# Verify cache is working
bin/console cache:pool:list
```

## Common Development Tasks

### Creating New Features

```bash
# 1. Create entity
bin/console make:entity Product

# 2. Create migration
bin/console make:migration

# 3. Run migration
bin/console doctrine:migrations:migrate

# 4. Create controller
bin/console make:controller ProductController

# 5. Create form (if needed)
bin/console make:form ProductType

# 6. Create test
bin/console make:test WebTestCase ProductControllerTest
```

### Working with Doctrine

```bash
# Validate mapping
bin/console doctrine:schema:validate

# Show SQL that would be executed
bin/console doctrine:schema:update --dump-sql

# Generate migration from entity changes
bin/console make:migration

# Load fixtures
bin/console doctrine:fixtures:load

# Reset database
bin/console doctrine:database:drop --force
bin/console doctrine:database:create
bin/console doctrine:migrations:migrate --no-interaction
bin/console doctrine:fixtures:load --no-interaction
```

### Working with Messenger

```bash
# Process messages
bin/console messenger:consume async -vv

# Process with limits
bin/console messenger:consume async --limit=10 --time-limit=60

# View failed messages
bin/console messenger:failed:show

# Retry failed messages
bin/console messenger:failed:retry --all

# Stop workers gracefully
bin/console messenger:stop-workers
```

## Debugging

### Debug Tools

```bash
# Debug routes
bin/console debug:router
bin/console debug:router api_products_get_collection

# Debug container/services
bin/console debug:container
bin/console debug:container ProductService
bin/console debug:autowiring Product

# Debug configuration
bin/console debug:config framework
bin/console debug:config api_platform

# Debug event dispatcher
bin/console debug:event-dispatcher
bin/console debug:event-dispatcher kernel.request
```

### Profiler

```bash
# Enable profiler (dev only)
# Visit: /_profiler

# Check latest profiles via CLI
bin/console profiler:list
```

### Logging

```bash
# Tail logs
tail -f var/log/dev.log

# Filter logs
grep "ERROR" var/log/dev.log
grep "doctrine" var/log/dev.log
```

### Dump and Die

```php
// In code
dump($variable);    // Dump but continue
dd($variable);      // Dump and die

// In Twig
{{ dump(variable) }}
```

## Testing Workflow

### Running Tests

```bash
# All tests
./vendor/bin/phpunit
# Or with Pest
./vendor/bin/pest

# Specific test file
./vendor/bin/pest tests/Functional/Api/ProductTest.php

# Specific test method
./vendor/bin/pest --filter "creates product"

# With coverage
./vendor/bin/pest --coverage --min=80

# Parallel execution
./vendor/bin/pest --parallel
```

### TDD Cycle

```bash
# 1. Write failing test
./vendor/bin/pest tests/Unit/Service/ProductServiceTest.php

# 2. Implement minimum code to pass

# 3. Run test again - should pass
./vendor/bin/pest tests/Unit/Service/ProductServiceTest.php

# 4. Refactor

# 5. Run all tests
./vendor/bin/pest
```

## Code Quality

### Before Committing

```bash
# Fix code style
./vendor/bin/php-cs-fixer fix

# Run static analysis
./vendor/bin/phpstan analyse

# Run tests
./vendor/bin/pest

# All checks
composer run-script check
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

./vendor/bin/php-cs-fixer fix --dry-run
if [ $? -ne 0 ]; then
    echo "Fix code style before committing"
    exit 1
fi

./vendor/bin/phpstan analyse
if [ $? -ne 0 ]; then
    echo "Fix PHPStan errors before committing"
    exit 1
fi
```

## API Development

### Testing API Endpoints

```bash
# Using curl
curl -X GET http://localhost/api/products
curl -X POST http://localhost/api/products \
    -H "Content-Type: application/json" \
    -d '{"name": "Test", "price": 1999}'

# Using httpie (cleaner)
http GET localhost/api/products
http POST localhost/api/products name="Test" price:=1999
```

### API Documentation

```bash
# Generate OpenAPI spec
bin/console api:openapi:export --output=openapi.json

# View in browser
# http://localhost/api/docs
```

## End of Day

### Clean Up

```bash
# Stop services
docker compose down

# Or keep data but stop containers
docker compose stop
```

### Commit Work

```bash
# Check status
git status

# Stage changes
git add -p  # Interactive staging

# Commit
git commit -m "feat: add product filtering"

# Push
git push origin feature/product-filtering
```

## Quick Reference

| Task | Command |
|------|---------|
| Clear cache | `bin/console cache:clear` |
| Run migrations | `bin/console doctrine:migrations:migrate` |
| Load fixtures | `bin/console doctrine:fixtures:load` |
| Run tests | `./vendor/bin/pest` |
| Fix code style | `./vendor/bin/php-cs-fixer fix` |
| Static analysis | `./vendor/bin/phpstan analyse` |
| Debug routes | `bin/console debug:router` |
| Debug services | `bin/console debug:container` |
| Consume messages | `bin/console messenger:consume async` |


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- rg --files
- composer validate
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

