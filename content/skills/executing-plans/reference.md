# Reference

# Executing Implementation Plans

Follow this skill to execute plans systematically with quality gates.

## Execution Workflow

### Step 1: Setup

Before starting:

```bash
# Ensure clean state
git status

# Create feature branch
git checkout -b feature/[feature-name]

# Pull latest dependencies
composer install

# Clear cache
bin/console cache:clear

# Ensure tests pass
./vendor/bin/pest  # or phpunit
```

### Step 2: For Each Plan Step

Follow the TDD cycle:

```
┌─────────────────┐
│   Read Step     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Write Test     │◄──────┐
│   (RED)         │       │
└────────┬────────┘       │
         │                │
         ▼                │
┌─────────────────┐       │
│  Run Test       │       │
│  (Verify Fail)  │       │
└────────┬────────┘       │
         │                │
         ▼                │
┌─────────────────┐       │
│  Implement      │       │
│  (GREEN)        │       │
└────────┬────────┘       │
         │                │
         ▼                │
┌─────────────────┐       │
│  Run Test       │───No──┘
│  (Verify Pass)  │
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│  Refactor       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Commit         │
└─────────────────┘
```

### Step 3: Commit Strategy

Commit after each completed step:

```bash
# Stage changes
git add src/Entity/Order.php
git add tests/Unit/Entity/OrderTest.php

# Commit with clear message
git commit -m "feat(order): add Order entity with status enum

- Create Order entity with uuid, status, customer relation
- Create OrderStatus enum (pending, processing, completed, cancelled)
- Add migration for orders table
- Add unit tests for entity"
```

### Step 4: Quality Gates

Run after each phase:

```bash
# Code style
./vendor/bin/php-cs-fixer fix --dry-run

# Static analysis
./vendor/bin/phpstan analyse

# Tests
./vendor/bin/pest

# All checks
composer run-script check
```

## Execution Patterns

### Entity Implementation

```bash
# 1. Create test
# tests/Unit/Entity/OrderTest.php

# 2. Create entity
bin/console make:entity Order

# 3. Adjust entity code

# 4. Create migration
bin/console make:migration

# 5. Run migration
bin/console doctrine:migrations:migrate

# 6. Verify
bin/console doctrine:schema:validate
```

### Service Implementation

```bash
# 1. Create test
# tests/Unit/Service/OrderServiceTest.php

# 2. Create service interface (if needed)
# src/Service/OrderServiceInterface.php

# 3. Create service
# src/Service/OrderService.php

# 4. Configure in services.yaml (if needed)

# 5. Run tests
./vendor/bin/pest tests/Unit/Service/OrderServiceTest.php
```

### API Endpoint Implementation

```bash
# 1. Create functional test
# tests/Functional/Api/OrderTest.php

# 2. Configure API Platform resource

# 3. Create/configure voter

# 4. Run tests
./vendor/bin/pest tests/Functional/Api/OrderTest.php

# 5. Verify in browser/Postman
curl http://localhost/api/orders
```

### Message Handler Implementation

```bash
# 1. Create message class
# src/Message/ProcessOrder.php

# 2. Create handler test
# tests/Unit/MessageHandler/ProcessOrderHandlerTest.php

# 3. Create handler
# src/MessageHandler/ProcessOrderHandler.php

# 4. Configure routing in messenger.yaml

# 5. Run tests with in-memory transport
./vendor/bin/pest tests/Unit/MessageHandler/
```

## Handling Blockers

### When tests fail unexpectedly

```bash
# Run single test with verbose output
./vendor/bin/pest tests/path/to/Test.php --filter testName -vvv

# Check logs
tail -f var/log/dev.log

# Debug with dump
dd($variable);  # or dump($variable);
```

### When migrations fail

```bash
# Check status
bin/console doctrine:migrations:status

# Rollback last migration
bin/console doctrine:migrations:migrate prev

# Regenerate migration
bin/console doctrine:migrations:diff
```

### When services won't autowire

```bash
# Debug autowiring
bin/console debug:autowiring ServiceName

# Check container
bin/console debug:container ServiceName

# Clear cache
bin/console cache:clear
```

## Progress Tracking

Update plan checkboxes as you complete:

```markdown
## Steps
1. [x] Create entity ✓ (commit: abc123)
2. [x] Create migration ✓ (commit: def456)
3. [ ] Create service <- CURRENT
4. [ ] Create tests
```

## Final Validation

Before marking plan complete:

```bash
# Full test suite
./vendor/bin/pest

# Code coverage
./vendor/bin/pest --coverage --min=80

# Static analysis
./vendor/bin/phpstan analyse

# Code style
./vendor/bin/php-cs-fixer fix

# Manual testing
# - Test happy path
# - Test edge cases
# - Test error handling
```

## Merge Checklist

Before merging feature branch:

- [ ] All tests pass
- [ ] Code coverage maintained/improved
- [ ] No PHPStan errors
- [ ] Code style fixed
- [ ] Documentation updated
- [ ] PR reviewed
- [ ] Rebased on main


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

