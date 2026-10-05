# Reference

# Messenger Retry and Failure Handling

## Retry Configuration

```yaml
# config/packages/messenger.yaml
framework:
    messenger:
        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 3
                    delay: 1000           # Initial delay: 1 second
                    multiplier: 2         # Exponential backoff
                    max_delay: 60000      # Max delay: 1 minute
                    service: null         # Or custom retry strategy service

            # High-priority with aggressive retries
            high_priority:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                options:
                    queue_name: high_priority
                retry_strategy:
                    max_retries: 5
                    delay: 500
                    multiplier: 1.5

            # Failed message storage
            failed:
                dsn: 'doctrine://default?queue_name=failed'

        failure_transport: failed
```

## Retry Behavior

With the above config, retries happen at:
1. **Attempt 1**: Immediate
2. **Retry 1**: +1 second (1000ms)
3. **Retry 2**: +2 seconds (2000ms)
4. **Retry 3**: +4 seconds (4000ms)
5. **Failed**: Moved to `failed` transport

## Exception Types

### Unrecoverable - Don't Retry

```php
<?php

use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;

#[AsMessageHandler]
class ProcessPaymentHandler
{
    public function __invoke(ProcessPayment $message): void
    {
        try {
            $this->gateway->charge($message->amount);
        } catch (InvalidCardException $e) {
            // Card is invalid - retrying won't help
            throw new UnrecoverableMessageHandlingException(
                'Payment failed: invalid card',
                previous: $e
            );
        } catch (InsufficientFundsException $e) {
            // Permanent failure
            throw new UnrecoverableMessageHandlingException(
                'Payment failed: insufficient funds',
                previous: $e
            );
        }
    }
}
```

### Recoverable - Do Retry

```php
<?php

use Symfony\Component\Messenger\Exception\RecoverableMessageHandlingException;

#[AsMessageHandler]
class ProcessPaymentHandler
{
    public function __invoke(ProcessPayment $message): void
    {
        try {
            $this->gateway->charge($message->amount);
        } catch (GatewayTimeoutException $e) {
            // Gateway temporarily unavailable - retry
            throw new RecoverableMessageHandlingException(
                'Payment gateway timeout',
                previous: $e
            );
        } catch (RateLimitException $e) {
            // Rate limited - retry after delay, ignoring max_retries.
            // `retryDelay` (ms) and `forceRetry` (8.1+ — verify) let you retry
            // past the configured limit. forceRetry: false respects max_retries.
            throw new RecoverableMessageHandlingException(
                'Rate limited, will retry',
                previous: $e,
                retryDelay: 5000,
                forceRetry: true,
            );
        }
    }
}
```

> **Decode failures (8.1+ — verify):** messages that fail to decode are now
> routed through the retry/failure pipeline instead of being silently deleted,
> so a malformed payload lands in the `failed` transport for inspection.

## Custom Retry Strategy

```php
<?php
// src/Messenger/CustomRetryStrategy.php

namespace App\Messenger;

use App\Messenger\Stamp\DispatchedAtStamp;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Retry\RetryStrategyInterface;
use Symfony\Component\Messenger\Stamp\RedeliveryStamp;

class CustomRetryStrategy implements RetryStrategyInterface
{
    public function isRetryable(Envelope $message, ?\Throwable $throwable = null): bool
    {
        // Don't retry if max retries exceeded
        $retryCount = RedeliveryStamp::getRetryCountFromEnvelope($message);
        if ($retryCount >= 5) {
            return false;
        }

        // Don't retry certain exceptions
        if ($throwable instanceof \InvalidArgumentException) {
            return false;
        }

        // Don't retry if message is too old. Symfony stamps carry no send
        // time (SentStamp only has the sender class and alias), so the app
        // adds its own DispatchedAtStamp when dispatching.
        $dispatchedAt = $message->last(DispatchedAtStamp::class)?->at;
        if ($dispatchedAt && $dispatchedAt < new \DateTimeImmutable('-1 hour')) {
            return false;
        }

        return true;
    }

    public function getWaitingTime(Envelope $message, ?\Throwable $throwable = null): int
    {
        $retryCount = RedeliveryStamp::getRetryCountFromEnvelope($message);

        // Custom delays based on retry count
        return match ($retryCount) {
            0 => 1000,    // 1 second
            1 => 5000,    // 5 seconds
            2 => 30000,   // 30 seconds
            3 => 120000,  // 2 minutes
            default => 300000, // 5 minutes
        };
    }
}
```

The stamp the strategy reads:

```php
<?php
// src/Messenger/Stamp/DispatchedAtStamp.php

namespace App\Messenger\Stamp;

use Symfony\Component\Messenger\Stamp\StampInterface;

final class DispatchedAtStamp implements StampInterface
{
    public function __construct(
        public readonly \DateTimeImmutable $at = new \DateTimeImmutable(),
    ) {}
}

// $bus->dispatch($message, [new DispatchedAtStamp()]);
```

Register:

```yaml
services:
    App\Messenger\CustomRetryStrategy: ~

framework:
    messenger:
        transports:
            async:
                retry_strategy:
                    service: App\Messenger\CustomRetryStrategy
```

## Managing Failed Messages

### CLI Commands

```bash
# View failed messages (filterable / with stats)
bin/console messenger:failed:show [--max=50] [--class-filter='App\Message\Foo'] [--stats]

# View a specific failed message with full stack trace
bin/console messenger:failed:show 123 -vv

# Retry messages (interactive unless --force); target a transport
bin/console messenger:failed:retry [--force] [--transport=failed]
bin/console messenger:failed:retry 123 --force

# Remove failed messages
bin/console messenger:failed:remove 123
bin/console messenger:failed:remove --all [--class-filter='App\Message\Foo']
```

### Programmatic Retry

```php
<?php

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Messenger\Transport\Receiver\ListableReceiverInterface;

class FailedMessageService
{
    public function __construct(
        // find() and all() come from ListableReceiverInterface, not ReceiverInterface
        #[Autowire(service: 'messenger.transport.failed')]
        private ListableReceiverInterface $failedTransport,
        private MessageBusInterface $bus,
    ) {}

    public function retryMessage(int $id): void
    {
        $envelope = $this->failedTransport->find($id);

        if (!$envelope) {
            throw new \RuntimeException("Message {$id} not found");
        }

        // Re-dispatch through the routing config. Stamps from the first
        // delivery are dropped; `messenger:failed:retry` keeps them, so prefer
        // the command unless you need a custom flow.
        $this->bus->dispatch($envelope->getMessage());

        // Remove from failed queue
        $this->failedTransport->reject($envelope);
    }

    public function getFailedMessages(): iterable
    {
        return $this->failedTransport->all();
    }
}
```

## Failure Notifications

```php
<?php
// src/EventSubscriber/MessengerFailureSubscriber.php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Messenger\Event\WorkerMessageFailedEvent;
use Symfony\Component\Notifier\NotifierInterface;
use Symfony\Component\Notifier\Notification\Notification;

class MessengerFailureSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private NotifierInterface $notifier,
        private LoggerInterface $logger,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            WorkerMessageFailedEvent::class => 'onMessageFailed',
        ];
    }

    public function onMessageFailed(WorkerMessageFailedEvent $event): void
    {
        // Only notify on final failure (not retries)
        if ($event->willRetry()) {
            return;
        }

        $envelope = $event->getEnvelope();
        $message = $envelope->getMessage();
        $throwable = $event->getThrowable();

        $this->logger->error('Message failed permanently', [
            'message_class' => get_class($message),
            'error' => $throwable->getMessage(),
        ]);

        // Send notification
        $notification = (new Notification('Message Failed', ['email']))
            ->content(sprintf(
                "Message %s failed: %s",
                get_class($message),
                $throwable->getMessage()
            ));

        $this->notifier->send($notification);
    }
}
```

## Idempotent Handlers

Design handlers to be safely retried:

```php
<?php

#[AsMessageHandler]
class ProcessOrderHandler
{
    public function __invoke(ProcessOrder $message): void
    {
        $order = $this->orders->find($message->orderId);

        // Idempotency check - already processed?
        if ($order->getStatus() === OrderStatus::PROCESSED) {
            $this->logger->info('Order already processed, skipping');
            return; // Success - don't throw
        }

        // Idempotency key for external calls
        $idempotencyKey = sprintf('order_%d_%s', $order->getId(), $order->getUpdatedAt()->format('U'));

        $this->paymentGateway->charge(
            amount: $order->getTotal(),
            idempotencyKey: $idempotencyKey
        );

        $order->setStatus(OrderStatus::PROCESSED);
        $this->em->flush();
    }
}
```

## Best Practices

1. **Use exception types**: `Unrecoverable` vs `Recoverable`
2. **Idempotent handlers**: Safe to retry multiple times
3. **Monitor failed queue**: Set up alerts
4. **Reasonable max retries**: 3-5 usually sufficient
5. **Exponential backoff**: Don't hammer failing services
6. **Log failures**: With context for debugging

## Validation commands
- php bin/console messenger:failed:show --stats
- php bin/console messenger:failed:show <id> -vv
- ./vendor/bin/phpunit --filter=Messenger
