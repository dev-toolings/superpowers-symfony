# Reference

# Configuration and Environment Management

## Environment Files

### File Hierarchy

```
.env                 # Default values (committed)
.env.local           # Local overrides (not committed)
.env.test            # Test environment defaults
.env.test.local      # Local test overrides (not committed)
.env.prod            # Production defaults
.env.prod.local      # Production local overrides
```

### Loading Order

```
1. .env
2. .env.local (not in test)
3. .env.{APP_ENV}
4. .env.{APP_ENV}.local
```

Later files override earlier ones.

### .env Syntax

```bash
# .env

# App configuration
APP_ENV=dev
APP_DEBUG=true
APP_SECRET=change-this-in-production

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/myapp?serverVersion=15"

# Mailer
MAILER_DSN=smtp://localhost:1025

# Third-party APIs
STRIPE_API_KEY=sk_test_xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Feature flags
FEATURE_NEW_CHECKOUT=false
```

### Type Casting

```bash
# Boolean
FEATURE_ENABLED=true    # string "true"

# In PHP, compare as string or cast
$enabled = $_ENV['FEATURE_ENABLED'] === 'true';

# Or use filter_var
$enabled = filter_var($_ENV['FEATURE_ENABLED'], FILTER_VALIDATE_BOOLEAN);
```

## Parameters

### Define in services.yaml

```yaml
# config/services.yaml
parameters:
    app.admin_email: 'admin@example.com'
    app.items_per_page: 20
    app.supported_locales: ['en', 'fr', 'de']

    # Using environment variables
    app.database_url: '%env(DATABASE_URL)%'
    app.stripe_key: '%env(STRIPE_API_KEY)%'

    # Type casting
    app.port: '%env(int:APP_PORT)%'
    app.debug: '%env(bool:APP_DEBUG)%'
    app.hosts: '%env(json:ALLOWED_HOSTS)%'
```

### Environment Variable Processors

```yaml
parameters:
    # Cast to int
    port: '%env(int:PORT)%'

    # Cast to bool
    debug: '%env(bool:DEBUG)%'

    # Cast to float
    rate: '%env(float:TAX_RATE)%'

    # Parse JSON
    config: '%env(json:CONFIG_JSON)%'

    # Parse CSV
    hosts: '%env(csv:ALLOWED_HOSTS)%'

    # Base64 decode
    secret: '%env(base64:ENCODED_SECRET)%'

    # Read from file
    cert: '%env(file:SSL_CERT_PATH)%'

    # Resolve env var name from another env var
    dsn: '%env(resolve:DATABASE_DSN)%'

    # Default value
    port: '%env(default:3000:PORT)%'

    # Chained processors
    config: '%env(json:file:CONFIG_PATH)%'
```

### Use in Services

```php
<?php

class PaginationService
{
    public function __construct(
        #[Autowire('%app.items_per_page%')]
        private int $itemsPerPage,
    ) {}
}

// Or bind in services.yaml
services:
    _defaults:
        bind:
            $adminEmail: '%app.admin_email%'
            $itemsPerPage: '%app.items_per_page%'
```

## Secrets

### Creating Secrets

```bash
# Generate keys (once per environment)
php bin/console secrets:generate-keys

# Add a secret
php bin/console secrets:set DATABASE_PASSWORD

# For production
php bin/console secrets:set DATABASE_PASSWORD --env=prod

# From file
php bin/console secrets:set SSL_CERT < cert.pem
```

### Secrets Storage

```
config/secrets/
├── dev/
│   ├── dev.encrypt.public.php    # Public key (committed)
│   └── dev.decrypt.private.php   # Private key (not committed)
└── prod/
    ├── prod.encrypt.public.php
    ├── prod.DATABASE_PASSWORD.28a3f.php  # Encrypted secret
    └── prod.decrypt.private.php  # Deploy securely
```

### Using Secrets

```yaml
# Secrets are accessed like env vars
parameters:
    database_password: '%env(DATABASE_PASSWORD)%'

doctrine:
    dbal:
        password: '%env(DATABASE_PASSWORD)%'
```

### List Secrets

```bash
php bin/console secrets:list
php bin/console secrets:list --reveal  # Show values
```

## Environment-Specific Config

### Config Files

```
config/
├── packages/
│   ├── framework.yaml           # All environments
│   ├── doctrine.yaml
│   ├── dev/
│   │   └── web_profiler.yaml    # Dev only
│   ├── prod/
│   │   └── doctrine.yaml        # Prod overrides
│   └── test/
│       └── framework.yaml       # Test overrides
```

### When Blocks

```yaml
# config/packages/framework.yaml
when@dev:
    framework:
        profiler:
            collect: true

when@prod:
    framework:
        profiler:
            collect: false

when@test:
    framework:
        test: true
```

## Feature Flags

```yaml
# config/services.yaml
parameters:
    feature.new_checkout: '%env(bool:FEATURE_NEW_CHECKOUT)%'
    feature.dark_mode: '%env(bool:FEATURE_DARK_MODE)%'
```

```php
<?php

class CheckoutController
{
    public function __construct(
        #[Autowire('%feature.new_checkout%')]
        private bool $newCheckoutEnabled,
    ) {}

    public function checkout(): Response
    {
        if ($this->newCheckoutEnabled) {
            return $this->newCheckoutFlow();
        }
        return $this->legacyCheckoutFlow();
    }
}
```

## Best Practices

### .env.local for Local Development

```bash
# .env.local (not committed)
DATABASE_URL="postgresql://dev:dev@localhost:5432/myapp_dev"
MAILER_DSN=smtp://localhost:1025
```

### Production Environment Variables

```bash
# Set via server/container environment, not files
export APP_ENV=prod
export APP_SECRET=your-production-secret
export DATABASE_URL="postgresql://prod:xxx@db.server:5432/myapp"
```

### Validation in Services

```php
class StripeService
{
    public function __construct(
        #[Autowire('%env(STRIPE_API_KEY)%')]
        private string $apiKey,
    ) {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('STRIPE_API_KEY is required');
        }
    }
}
```

### Don't Commit Sensitive Data

```gitignore
# .gitignore
.env.local
.env.*.local
config/secrets/*/decrypt.private.php
```

## Assets — AssetMapper (best practice)

The recommended way to ship frontend assets is **AssetMapper** (no Node bundler,
uses native ESM + importmaps). It is the default in modern Symfony.

```bash
composer require symfony/asset-mapper
php bin/console importmap:require bootstrap   # add a JS package
php bin/console importmap:audit               # security audit of pinned packages
php bin/console asset-map:compile             # build for production deploy
```

```yaml
# config/packages/asset_mapper.yaml
framework:
    asset_mapper:
        paths:
            - assets/
```

```twig
{# templates/base.html.twig #}
{{ importmap('app') }}
```

## Refreshable Env Vars (8.1+ — verify)

For long-running workers, inject an env var as a `\Closure` so it re-reads the
value between runs instead of freezing it at boot:

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;

public function __construct(
    #[Autowire(env: 'FEATURE_FLAGS')] private \Closure $featureFlags,  // ($this->featureFlags)()
) {}
```

YAML equivalent: `!env_closure '%env(FEATURE_FLAGS)%'`.

## Debug Configuration

```bash
# Show all parameters
php bin/console debug:container --parameters

# Show environment variables
php bin/console debug:container --env-vars

# Show secrets
php bin/console secrets:list --reveal
```


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

