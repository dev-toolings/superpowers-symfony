# Symfony Messenger Reference (Symfony)

Use this reference for implementation details and review criteria specific to `symfony-messenger`.

## Message + Handler

A message is a plain, serializable data class. The handler is a service with
`#[AsMessageHandler]` and a type-hinted `__invoke()`.

```php
<?php
// src/Message/SendWelcomeEmail.php

namespace App\Message;

final readonly class SendWelcomeEmail
{
    public function __construct(
        public int $userId,   // pass the ID, never the entity (see below)
    ) {}
}
```

```php
<?php
// src/MessageHandler/SendWelcomeEmailHandler.php

namespace App\MessageHandler;

use App\Message\SendWelcomeEmail;
use App\Repository\UserRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class SendWelcomeEmailHandler
{
    public function __construct(
        private UserRepository $users,
        private MailerInterface $mailer,
    ) {}

    public function __invoke(SendWelcomeEmail $message): void
    {
        // Refetch the entity from its ID inside the handler.
        $user = $this->users->find($message->userId)
            ?? throw new \RuntimeException("User {$message->userId} not found");

        // ... send the email
    }
}
```

Dispatch from anywhere with `MessageBusInterface`:

```php
$bus->dispatch(new SendWelcomeEmail($user->getId()));
```

## Routing

### Via attribute on the message class

```php
<?php

namespace App\Message;

use Symfony\Component\Messenger\Attribute\AsMessage;

#[AsMessage('async')]
// Multiple transports:
#[AsMessage(['async', 'audit'])]
final readonly class SendWelcomeEmail
{
    public function __construct(public int $userId) {}
}
```

### Via YAML

```yaml
# config/packages/messenger.yaml
framework:
    messenger:
        transports:
            async: '%env(MESSENGER_TRANSPORT_DSN)%'
        routing:
            'App\Message\SendWelcomeEmail': async
            'App\Message\*': async        # wildcard (suffix only)
            '*': async                    # default route for unmatched messages
```

## Transports

```yaml
framework:
    messenger:
        transports:
            # Doctrine (table-backed queue)
            async: 'doctrine://default?table_name=messenger_messages&queue_name=default'

            # Redis
            redis: 'redis://localhost:6379/messages'

            # AMQP (RabbitMQ)
            amqp: '%env(MESSENGER_TRANSPORT_DSN)%'   # amqp://guest:guest@localhost:5672/%2f/messages

            # Synchronous — handled in-process, no worker (good for dev)
            sync: 'sync://'

            # In-memory — for tests; messages collected, never delivered
            in_memory: 'in-memory://'
```

Doctrine on PostgreSQL supports smart LISTEN/NOTIFY (`use_notify`, default true) **(8.1+)**.

## Retry strategy & failure transport

```yaml
framework:
    messenger:
        failure_transport: failed
        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 3
                    delay: 1000        # ms before first retry
                    multiplier: 2      # exponential backoff
                    max_delay: 60000
                    jitter: 0.1
                    service: null      # custom RetryStrategyInterface
            failed: 'doctrine://default?queue_name=failed'
```

After `max_retries` is exhausted, the message moves to the `failed` transport.
See the `messenger-retry-failures` skill for exception types and the
`messenger:failed:*` commands.

## Multiple buses (command / query)

```yaml
framework:
    messenger:
        default_bus: command.bus
        buses:
            command.bus: ~
            query.bus: ~
        routing:
            'App\Command\*': command.bus
            'App\Query\*': query.bus
```

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Messenger\MessageBusInterface;

public function __construct(
    #[Autowire('@command.bus')] private MessageBusInterface $commandBus,
    #[Autowire('@query.bus')] private MessageBusInterface $queryBus,
) {}
```

See the `cqrs-and-handlers` skill for the full CQRS pattern.

## Consuming messages

```bash
php bin/console messenger:consume async -vv
php bin/console messenger:consume async_high async_low      # priority order
php bin/console messenger:consume --all --exclude-receivers=async_low
php bin/console messenger:consume async --limit=10 --memory-limit=128M --time-limit=3600
php bin/console messenger:stats
php bin/console debug:messenger
```

## Critical rules

- **Pass entity IDs, never entity objects.** Doctrine entities don't serialize
  cleanly (proxies, detached state). Refetch by ID inside the handler.
- **Make handlers idempotent.** A message may be redelivered. Use a stable
  idempotency key (derived from the business event) and check whether the work
  was already done before acting.

  ```php
  public function __invoke(ProcessOrder $message): void
  {
      $order = $this->orders->find($message->orderId);
      if ($order->getStatus() === OrderStatus::Processed) {
          return; // already done — success, don't throw
      }
      // ... process, then persist the new status
  }
  ```

## Recent features (Symfony 8.1+)

> Marked 8.1+ — verify the exact minimum version before relying on it.

- `PriorityStamp` for message-level prioritization (AMQP/Beanstalkd):
  ```php
  use Symfony\Component\Messenger\Envelope;
  use Symfony\Component\Messenger\Stamp\PriorityStamp;

  $bus->dispatch((new Envelope($message))->with(new PriorityStamp(255)));
  ```
- `messenger:consume scheduler_.*` — regex receiver names.
- `--fetch-size=N` — batch prefetch from the transport.
- `--no-reset=N` — reset stateful services every N messages.
- Graceful shutdown via PCNTL signals:
  ```yaml
  framework:
      messenger:
          stop_worker_on_signals: [SIGTERM, SIGINT, SIGUSR1]
  ```
  Trigger a rolling restart on deploy with `php bin/console messenger:stop-workers`.
- `ListableReceiverInterface` (Redis): `->all(10)`, `->find($id)`.
- Per-transport `rate_limiter`.
- Decode failures are now routed through the retry/failure pipeline instead of
  being silently dropped.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console messenger:consume --limit=1
- php bin/console messenger:failed:show
- ./vendor/bin/phpunit --filter=Messenger

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

