# Reference

# CQRS with Symfony Messenger

## Overview

CQRS (Command Query Responsibility Segregation) separates read and write operations:
- **Commands**: Change state (Create, Update, Delete)
- **Queries**: Read state (no side effects)

## Project Structure

```
src/
├── Application/
│   ├── Command/
│   │   ├── CreateOrder.php
│   │   └── CreateOrderHandler.php
│   └── Query/
│       ├── GetOrder.php
│       └── GetOrderHandler.php
├── Domain/
│   └── Order/
│       └── Entity/Order.php
└── Infrastructure/
    └── Controller/
        └── OrderController.php
```

## Commands

### Command Class

```php
<?php
// src/Application/Command/CreateOrder.php

namespace App\Application\Command;

final readonly class CreateOrder
{
    public function __construct(
        public int $customerId,
        public array $items,
        public ?string $couponCode = null,
    ) {}
}
```

### Command Handler

```php
<?php
// src/Application/Command/CreateOrderHandler.php

namespace App\Application\Command;

use App\Domain\Order\Entity\Order;
use App\Domain\Order\Repository\OrderRepositoryInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class CreateOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orders,
        private ProductService $products,
        private CouponService $coupons,
    ) {}

    public function __invoke(CreateOrder $command): Order
    {
        // Validate products exist
        $items = $this->products->resolveItems($command->items);

        // Create order
        $order = Order::create(
            $this->orders->nextId(),
            $command->customerId,
        );

        foreach ($items as $item) {
            $order->addItem($item);
        }

        // Apply coupon if provided
        if ($command->couponCode) {
            $discount = $this->coupons->apply($command->couponCode, $order);
            $order->applyDiscount($discount);
        }

        $this->orders->save($order);

        return $order;
    }
}
```

## Queries

### Query Class

```php
<?php
// src/Application/Query/GetOrder.php

namespace App\Application\Query;

final readonly class GetOrder
{
    public function __construct(
        public string $orderId,
    ) {}
}

// src/Application/Query/GetOrdersByCustomer.php

final readonly class GetOrdersByCustomer
{
    public function __construct(
        public int $customerId,
        public int $page = 1,
        public int $limit = 20,
    ) {}
}
```

### Query Handler

```php
<?php
// src/Application/Query/GetOrderHandler.php

namespace App\Application\Query;

use App\Domain\Order\Repository\OrderRepositoryInterface;
use App\Dto\OrderView;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class GetOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orders,
    ) {}

    public function __invoke(GetOrder $query): ?OrderView
    {
        $order = $this->orders->findById($query->orderId);

        if (!$order) {
            return null;
        }

        return OrderView::fromEntity($order);
    }
}

// src/Application/Query/GetOrdersByCustomerHandler.php

#[AsMessageHandler]
final readonly class GetOrdersByCustomerHandler
{
    public function __construct(
        private OrderReadRepository $readRepository,
    ) {}

    public function __invoke(GetOrdersByCustomer $query): PaginatedResult
    {
        return $this->readRepository->findByCustomer(
            $query->customerId,
            $query->page,
            $query->limit,
        );
    }
}
```

## Separate Buses

### Configuration

```yaml
# config/packages/messenger.yaml
framework:
    messenger:
        default_bus: command_bus

        buses:
            command_bus:
                middleware:
                    - validation
                    - doctrine_transaction

            query_bus:
                middleware:
                    - validation

        # Route by namespace so commands/queries land on the right bus.
        routing:
            'App\Application\Command\*': command_bus
            'App\Application\Query\*': query_bus
```

### Injecting the native buses directly

You don't need the wrapper interfaces below — Symfony registers each bus as
`messenger.bus.<name>`. Inject them with `#[Autowire]` and type
`MessageBusInterface`:

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Messenger\HandleTrait;
use Symfony\Component\Messenger\MessageBusInterface;

class OrderController extends AbstractController
{
    public function __construct(
        #[Autowire('@messenger.bus.command_bus')]
        private MessageBusInterface $commandBus,
        #[Autowire('@messenger.bus.query_bus')]
        private MessageBusInterface $queryBus,
    ) {}
}
```

To get the handler's return value synchronously (queries), use `HandleTrait`
in a thin service as shown in the next section.

### Bus Interfaces

```php
<?php
// src/Application/Bus/CommandBusInterface.php

namespace App\Application\Bus;

interface CommandBusInterface
{
    public function dispatch(object $command): mixed;
}

// src/Application/Bus/QueryBusInterface.php

interface QueryBusInterface
{
    public function ask(object $query): mixed;
}
```

### Implementations

```php
<?php
// src/Infrastructure/Bus/MessengerCommandBus.php

namespace App\Infrastructure\Bus;

use App\Application\Bus\CommandBusInterface;
use Symfony\Component\Messenger\HandleTrait;
use Symfony\Component\Messenger\MessageBusInterface;

final class MessengerCommandBus implements CommandBusInterface
{
    use HandleTrait;

    public function __construct(MessageBusInterface $commandBus)
    {
        $this->messageBus = $commandBus;
    }

    public function dispatch(object $command): mixed
    {
        return $this->handle($command);
    }
}

// src/Infrastructure/Bus/MessengerQueryBus.php

final class MessengerQueryBus implements QueryBusInterface
{
    use HandleTrait;

    public function __construct(MessageBusInterface $queryBus)
    {
        $this->messageBus = $queryBus;
    }

    public function ask(object $query): mixed
    {
        return $this->handle($query);
    }
}
```

### Service Configuration

```yaml
# config/services.yaml
services:
    App\Application\Bus\CommandBusInterface:
        class: App\Infrastructure\Bus\MessengerCommandBus
        arguments: ['@command.bus']

    App\Application\Bus\QueryBusInterface:
        class: App\Infrastructure\Bus\MessengerQueryBus
        arguments: ['@query.bus']
```

## Controller Usage

```php
<?php
// src/Infrastructure/Controller/OrderController.php

namespace App\Infrastructure\Controller;

use App\Application\Bus\CommandBusInterface;
use App\Application\Bus\QueryBusInterface;
use App\Application\Command\CreateOrder;
use App\Application\Query\GetOrder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/orders')]
class OrderController extends AbstractController
{
    public function __construct(
        private CommandBusInterface $commandBus,
        private QueryBusInterface $queryBus,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $order = $this->commandBus->dispatch(new CreateOrder(
            customerId: $data['customerId'],
            items: $data['items'],
            couponCode: $data['couponCode'] ?? null,
        ));

        return new JsonResponse(['id' => $order->getId()], 201);
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $order = $this->queryBus->ask(new GetOrder($id));

        if (!$order) {
            throw $this->createNotFoundException();
        }

        return new JsonResponse($order);
    }
}
```

## Read Models (Optional)

For complex reads, use dedicated read models:

```php
<?php
// src/Infrastructure/ReadModel/OrderReadRepository.php

namespace App\Infrastructure\ReadModel;

use Doctrine\DBAL\Connection;

class OrderReadRepository
{
    public function __construct(
        private Connection $connection,
    ) {}

    public function findByCustomer(int $customerId, int $page, int $limit): PaginatedResult
    {
        // Direct SQL for optimized reads
        $sql = <<<SQL
            SELECT o.id, o.total, o.status, o.created_at,
                   COUNT(i.id) as item_count
            FROM orders o
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE o.customer_id = :customerId
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT :limit OFFSET :offset
        SQL;

        $results = $this->connection->fetchAllAssociative($sql, [
            'customerId' => $customerId,
            'limit' => $limit,
            'offset' => ($page - 1) * $limit,
        ]);

        return new PaginatedResult($results, $this->countByCustomer($customerId));
    }
}
```

## Best Practices

1. **Commands change state**: Never return data from commands (except ID)
2. **Queries are side-effect free**: Can be cached, retried
3. **Separate handlers**: One handler per command/query
4. **Validation in commands**: Use Symfony Validator
5. **Read models for complex queries**: Optimize separately
6. **Transaction on commands**: Wrap in database transaction


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

