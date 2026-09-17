# Reference

# Interfaces and Autowiring in Symfony

## Basic Autowiring

Symfony automatically injects dependencies based on type-hints:

```php
<?php
// src/Service/OrderService.php

namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class OrderService
{
    public function __construct(
        private EntityManagerInterface $em,
        private LoggerInterface $logger,
    ) {}

    public function createOrder(array $data): Order
    {
        $this->logger->info('Creating order', $data);
        // ...
    }
}
```

No configuration needed - Symfony wires it automatically.

## Interface Binding

### Define Interface

```php
<?php
// src/Service/PaymentGatewayInterface.php

namespace App\Service;

interface PaymentGatewayInterface
{
    public function charge(int $amount, string $currency): PaymentResult;
    public function refund(string $transactionId, int $amount): RefundResult;
}
```

### Implementation

```php
<?php
// src/Service/StripePaymentGateway.php

namespace App\Service;

class StripePaymentGateway implements PaymentGatewayInterface
{
    public function __construct(
        private string $apiKey,
    ) {}

    public function charge(int $amount, string $currency): PaymentResult
    {
        // Stripe implementation
    }

    public function refund(string $transactionId, int $amount): RefundResult
    {
        // Stripe implementation
    }
}
```

### Bind Interface to Implementation

```yaml
# config/services.yaml
services:
    _defaults:
        autowire: true
        autoconfigure: true

    App\:
        resource: '../src/'
        exclude:
            - '../src/DependencyInjection/'
            - '../src/Entity/'
            - '../src/Kernel.php'

    # Bind interface to implementation
    App\Service\PaymentGatewayInterface: '@App\Service\StripePaymentGateway'

    # Or with parameters
    App\Service\StripePaymentGateway:
        arguments:
            $apiKey: '%env(STRIPE_API_KEY)%'
```

### Use in Services

```php
class OrderService
{
    public function __construct(
        private PaymentGatewayInterface $paymentGateway, // Autowired!
    ) {}
}
```

## Service Decoration

Wrap a service to add behavior without modifying it:

```php
<?php
// src/Service/LoggingPaymentGateway.php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;
use Symfony\Component\DependencyInjection\Attribute\AutowireDecorated;

#[AsDecorator(decorates: StripePaymentGateway::class)]
class LoggingPaymentGateway implements PaymentGatewayInterface
{
    public function __construct(
        #[AutowireDecorated]
        private PaymentGatewayInterface $inner,
        private LoggerInterface $logger,
    ) {}

    public function charge(int $amount, string $currency): PaymentResult
    {
        $this->logger->info('Charging payment', [
            'amount' => $amount,
            'currency' => $currency,
        ]);

        $result = $this->inner->charge($amount, $currency);

        $this->logger->info('Payment result', [
            'success' => $result->isSuccessful(),
            'transactionId' => $result->getTransactionId(),
        ]);

        return $result;
    }

    public function refund(string $transactionId, int $amount): RefundResult
    {
        $this->logger->info('Processing refund', [
            'transactionId' => $transactionId,
            'amount' => $amount,
        ]);

        return $this->inner->refund($transactionId, $amount);
    }
}
```

## Tagged Services

### Define Tag

```php
<?php
// src/Export/ExporterInterface.php

namespace App\Export;

use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.exporter')]
interface ExporterInterface
{
    public function supports(string $format): bool;
    public function export(array $data): string;
}
```

### Implementations

```php
<?php
// src/Export/CsvExporter.php

namespace App\Export;

class CsvExporter implements ExporterInterface
{
    public function supports(string $format): bool
    {
        return $format === 'csv';
    }

    public function export(array $data): string
    {
        // CSV export logic
    }
}

// src/Export/JsonExporter.php

class JsonExporter implements ExporterInterface
{
    public function supports(string $format): bool
    {
        return $format === 'json';
    }

    public function export(array $data): string
    {
        return json_encode($data, JSON_PRETTY_PRINT);
    }
}
```

### Inject All Tagged Services

```php
<?php
// src/Service/ExportService.php

namespace App\Service;

use App\Export\ExporterInterface;
use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;

class ExportService
{
    /**
     * @param iterable<ExporterInterface> $exporters
     */
    public function __construct(
        #[AutowireIterator('app.exporter')]
        private iterable $exporters,
    ) {}

    public function export(array $data, string $format): string
    {
        foreach ($this->exporters as $exporter) {
            if ($exporter->supports($format)) {
                return $exporter->export($data);
            }
        }

        throw new \InvalidArgumentException("Unsupported format: {$format}");
    }

    public function getSupportedFormats(): array
    {
        $formats = [];
        foreach ($this->exporters as $exporter) {
            // Each exporter reports what it supports
        }
        return $formats;
    }
}
```

## Named Autowiring

When you have multiple implementations:

```yaml
# config/services.yaml
services:
    App\Service\StripePaymentGateway:
        arguments:
            $apiKey: '%env(STRIPE_API_KEY)%'

    App\Service\PaypalPaymentGateway:
        arguments:
            $clientId: '%env(PAYPAL_CLIENT_ID)%'

    # Named bindings
    App\Service\PaymentGatewayInterface $stripeGateway: '@App\Service\StripePaymentGateway'
    App\Service\PaymentGatewayInterface $paypalGateway: '@App\Service\PaypalPaymentGateway'
```

```php
class PaymentService
{
    public function __construct(
        private PaymentGatewayInterface $stripeGateway, // Stripe
        private PaymentGatewayInterface $paypalGateway, // PayPal
    ) {}
}
```

> **Deprecation (8.1+ — verify):** matching a named alias by the *parameter name*
> alone (as above) is deprecated. Prefer `#[Target]` so the binding is explicit
> and rename-safe.

## Named Autowiring with #[Target]

`#[Target]` selects a specific implementation by its alias name, independent of
the parameter name:

```php
use Symfony\Component\DependencyInjection\Attribute\Target;

class MastodonClient
{
    public function __construct(
        #[Target('shoutyTransformer')]
        private TransformerInterface $transformer,
    ) {}
}
```

```yaml
services:
    App\Util\TransformerInterface $shoutyTransformer: '@App\Util\UppercaseTransformer'
    App\Util\TransformerInterface: '@App\Util\Rot13Transformer'   # default
```

Inspect candidates: `php bin/console debug:autowiring TransformerInterface`.

## #[Autowire] — scalars, params, env, expressions

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;

public function __construct(
    #[Autowire(service: 'monolog.logger.request')] private LoggerInterface $logger,
    #[Autowire('%kernel.project_dir%/data')] private string $dataDir,
    #[Autowire(param: 'kernel.debug')] private bool $debugMode,
    #[Autowire(env: 'SOME_ENV_VAR')] private string $senderName,
    #[Autowire(env: 'bool:ALLOW_ATTACHMENTS')] private bool $allowAttachments,
    #[Autowire(expression: 'service("App\\\Mail\\\MailerConfiguration").getMailerMethod()')] private string $mailerMethod,
) {}
```

### Refreshable env vars in long-running workers (8.1+ — verify)

For workers (Messenger, daemons), inject an env var as a `\Closure` so it can
refresh between messages instead of being frozen at boot:

```php
public function __construct(
    #[Autowire(env: 'DB_URL')] private \Closure $dbUrl,   // ($this->dbUrl)()
) {}
```

### Service closures

```php
use Symfony\Component\DependencyInjection\Attribute\AutowireServiceClosure;

#[AutowireServiceClosure('mailer.default')]
private \Closure $mailer;   // ($this->mailer)()->send(...) — lazily resolved
```

### Inline anonymous services (8.1+ — verify)

```php
use Symfony\Component\DependencyInjection\Attribute\AutowireInline;

public function __construct(
    #[AutowireInline(
        class: [ScopingHttpClient::class, 'forBaseUri'],
        arguments: ['$baseUri' => 'https://api.example.com'],
    )]
    private HttpClientInterface $client,
) {}
```

## Lazy Services

Load service only when actually used:

```php
use Symfony\Component\DependencyInjection\Attribute\Lazy;

#[Lazy]
class ExpensiveService
{
    public function __construct()
    {
        // Heavy initialization
    }
}
```

## Debug Commands

```bash
# List all services
bin/console debug:container

# Find specific service
bin/console debug:container OrderService

# Show autowiring candidates
bin/console debug:autowiring

# Show autowiring for specific type
bin/console debug:autowiring Payment
```

## Best Practices

1. **Program to interfaces**: Depend on interfaces, not implementations
2. **Constructor injection**: Always use constructor injection
3. **Final classes**: Make services `final` by default
4. **Readonly properties**: Use `private readonly` for dependencies
5. **Minimal interfaces**: Keep interfaces focused (ISP)
6. **Decorate, don't modify**: Use decoration for cross-cutting concerns


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

