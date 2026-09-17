# Reference

# Strategy Pattern with Tagged Services

## The Pattern

Strategy allows selecting an algorithm at runtime. In Symfony, use tagged services for clean implementation.

## Example: Payment Processors

### Define Interface

```php
<?php
// src/Payment/PaymentProcessorInterface.php

namespace App\Payment;

interface PaymentProcessorInterface
{
    public function supports(string $method): bool;
    public function process(Payment $payment): PaymentResult;
    public function refund(Payment $payment, int $amount): RefundResult;
}
```

### Implementations

```php
<?php
// src/Payment/Processor/StripeProcessor.php

namespace App\Payment\Processor;

use App\Payment\PaymentProcessorInterface;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.payment_processor')]
class StripeProcessor implements PaymentProcessorInterface
{
    public function __construct(
        private StripeClient $stripe,
    ) {}

    public function supports(string $method): bool
    {
        return in_array($method, ['card', 'stripe'], true);
    }

    public function process(Payment $payment): PaymentResult
    {
        $charge = $this->stripe->charges->create([
            'amount' => $payment->getAmount(),
            'currency' => $payment->getCurrency(),
            'source' => $payment->getToken(),
        ]);

        return new PaymentResult(
            success: $charge->status === 'succeeded',
            transactionId: $charge->id,
        );
    }

    public function refund(Payment $payment, int $amount): RefundResult
    {
        // Stripe refund implementation
    }
}

// src/Payment/Processor/PayPalProcessor.php

#[AutoconfigureTag('app.payment_processor')]
class PayPalProcessor implements PaymentProcessorInterface
{
    public function supports(string $method): bool
    {
        return $method === 'paypal';
    }

    public function process(Payment $payment): PaymentResult
    {
        // PayPal implementation
    }

    public function refund(Payment $payment, int $amount): RefundResult
    {
        // PayPal refund implementation
    }
}

// src/Payment/Processor/BankTransferProcessor.php

#[AutoconfigureTag('app.payment_processor')]
class BankTransferProcessor implements PaymentProcessorInterface
{
    public function supports(string $method): bool
    {
        return $method === 'bank_transfer';
    }

    public function process(Payment $payment): PaymentResult
    {
        // Bank transfer - create pending payment
        return new PaymentResult(
            success: true,
            transactionId: uniqid('bt_'),
            pending: true,
        );
    }

    public function refund(Payment $payment, int $amount): RefundResult
    {
        // Bank transfer refund
    }
}
```

### Strategy Manager

```php
<?php
// src/Payment/PaymentService.php

namespace App\Payment;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;

class PaymentService
{
    /**
     * @param iterable<PaymentProcessorInterface> $processors
     */
    public function __construct(
        #[AutowireIterator('app.payment_processor')]
        private iterable $processors,
    ) {}

    public function process(Payment $payment, string $method): PaymentResult
    {
        $processor = $this->getProcessor($method);

        return $processor->process($payment);
    }

    public function refund(Payment $payment, int $amount): RefundResult
    {
        $processor = $this->getProcessor($payment->getMethod());

        return $processor->refund($payment, $amount);
    }

    public function getSupportedMethods(): array
    {
        $methods = [];

        foreach ($this->processors as $processor) {
            // Each processor reports what it supports
        }

        return $methods;
    }

    private function getProcessor(string $method): PaymentProcessorInterface
    {
        foreach ($this->processors as $processor) {
            if ($processor->supports($method)) {
                return $processor;
            }
        }

        throw new UnsupportedPaymentMethodException($method);
    }
}
```

## Example: Export Formats

```php
<?php
// src/Export/ExporterInterface.php

namespace App\Export;

use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag('app.exporter')]
interface ExporterInterface
{
    public static function getFormat(): string;
    public function export(array $data): string;
    public function getContentType(): string;
    public function getFileExtension(): string;
}

// src/Export/CsvExporter.php

class CsvExporter implements ExporterInterface
{
    public static function getFormat(): string
    {
        return 'csv';
    }

    public function export(array $data): string
    {
        $output = fopen('php://temp', 'r+');

        if (!empty($data)) {
            fputcsv($output, array_keys($data[0]));
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }

        rewind($output);
        return stream_get_contents($output);
    }

    public function getContentType(): string
    {
        return 'text/csv';
    }

    public function getFileExtension(): string
    {
        return 'csv';
    }
}

// src/Export/JsonExporter.php

class JsonExporter implements ExporterInterface
{
    public static function getFormat(): string
    {
        return 'json';
    }

    public function export(array $data): string
    {
        return json_encode($data, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    }

    public function getContentType(): string
    {
        return 'application/json';
    }

    public function getFileExtension(): string
    {
        return 'json';
    }
}

// src/Export/XlsxExporter.php

class XlsxExporter implements ExporterInterface
{
    public static function getFormat(): string
    {
        return 'xlsx';
    }

    public function export(array $data): string
    {
        // PhpSpreadsheet implementation
    }

    public function getContentType(): string
    {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    public function getFileExtension(): string
    {
        return 'xlsx';
    }
}
```

### Export Service

```php
<?php
// src/Export/ExportService.php

namespace App\Export;

use Symfony\Component\DependencyInjection\Attribute\TaggedLocator;
use Symfony\Component\DependencyInjection\ServiceLocator;

class ExportService
{
    public function __construct(
        #[TaggedLocator('app.exporter', defaultIndexMethod: 'getFormat')]
        private ServiceLocator $exporters,
    ) {}

    public function export(array $data, string $format): ExportResult
    {
        if (!$this->exporters->has($format)) {
            throw new UnsupportedFormatException($format);
        }

        /** @var ExporterInterface $exporter */
        $exporter = $this->exporters->get($format);

        return new ExportResult(
            content: $exporter->export($data),
            contentType: $exporter->getContentType(),
            filename: 'export.' . $exporter->getFileExtension(),
        );
    }

    public function getAvailableFormats(): array
    {
        return array_keys($this->exporters->getProvidedServices());
    }
}
```

## Priority in Tagged Services

```php
#[AutoconfigureTag('app.payment_processor', ['priority' => 10])]
class StripeProcessor implements PaymentProcessorInterface
{
    // Higher priority = checked first
}

#[AutoconfigureTag('app.payment_processor', ['priority' => 0])]
class FallbackProcessor implements PaymentProcessorInterface
{
    // Lower priority = fallback
}
```

## Testing

```php
class PaymentServiceTest extends TestCase
{
    public function testSelectsCorrectProcessor(): void
    {
        $stripe = $this->createMock(PaymentProcessorInterface::class);
        $stripe->method('supports')->willReturnCallback(
            fn($m) => $m === 'card'
        );

        $paypal = $this->createMock(PaymentProcessorInterface::class);
        $paypal->method('supports')->willReturnCallback(
            fn($m) => $m === 'paypal'
        );

        $service = new PaymentService([$stripe, $paypal]);

        // Verify correct processor is selected
        $stripe->expects($this->once())->method('process');
        $service->process($payment, 'card');
    }
}
```

## Best Practices

1. **Interface first**: Define clear contract
2. **AutoconfigureTag**: On interface or each implementation
3. **Service locator**: For direct access by key
4. **Iterator**: When checking all strategies
5. **Priority**: Control evaluation order
6. **Fallback**: Include a default strategy


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

