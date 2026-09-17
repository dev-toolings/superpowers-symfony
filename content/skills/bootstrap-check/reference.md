# Reference

# Bootstrap Check

Verify your Symfony project is properly configured before starting development.

## Essential Files Check

### 1. Environment Configuration

```bash
# Required files
.env                    # Base environment variables
.env.local              # Local overrides (not committed)
.env.test               # Test environment

# Check .env exists
ls -la .env*
```

### 2. Configuration Files

```bash
# Framework configuration
config/packages/framework.yaml
config/packages/doctrine.yaml
config/packages/security.yaml
config/services.yaml

# Routes
config/routes.yaml
config/routes/annotations.yaml  # or attributes.yaml
```

### 3. Directory Structure

```
your-project/
├── bin/
│   └── console
├── config/
│   ├── packages/
│   ├── routes/
│   └── services.yaml
├── public/
│   └── index.php
├── src/
│   ├── Controller/
│   ├── Entity/
│   └── Kernel.php
├── var/
│   ├── cache/
│   └── log/
├── vendor/
├── composer.json
└── composer.lock
```

## Quick Validation Commands

```bash
# Check Symfony requirements
bin/console about

# Verify services are wired correctly
bin/console debug:autowiring

# Check routes
bin/console debug:router

# Verify Doctrine configuration
bin/console doctrine:mapping:info

# Check container compilation
bin/console cache:clear
```

## Common Issues & Fixes

### 1. Missing APP_SECRET

```bash
# .env
APP_SECRET=your-secret-here

# Generate new secret
php -r "echo bin2hex(random_bytes(16));"
```

### 2. Database Not Configured

```bash
# .env
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/db?serverVersion=15"
# or
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/db?serverVersion=8.0"
```

### 3. Cache Permission Issues

```bash
# Clear and warm cache
bin/console cache:clear
bin/console cache:warmup

# Fix permissions
chmod -R 777 var/cache var/log
# Or better, use ACL
setfacl -R -m u:www-data:rwX var
setfacl -dR -m u:www-data:rwX var
```

### 4. Missing Vendor Directory

```bash
composer install
```

### 5. Doctrine Schema Out of Sync

```bash
# Check differences
bin/console doctrine:schema:validate

# Generate migration
bin/console make:migration

# Run migrations
bin/console doctrine:migrations:migrate
```

## API Platform Check

If using API Platform:

```bash
# Verify API Platform is working
bin/console debug:router | grep api

# Check API resources
bin/console api:openapi:export

# Verify serialization groups
bin/console debug:serializer
```

## Messenger Check

If using Messenger:

```bash
# Verify transports
bin/console debug:messenger

# Check routing
bin/console debug:config framework messenger
```

## Pre-Development Checklist

- [ ] `.env` file exists with required variables
- [ ] `composer install` executed
- [ ] Database connection working
- [ ] `bin/console cache:clear` succeeds
- [ ] `bin/console debug:autowiring` shows services
- [ ] All migrations executed
- [ ] (Optional) Fixtures loaded for development


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

