# Reference

# Ports and Adapters (Hexagonal Architecture)

## Concept

Hexagonal Architecture separates your application into three layers:
- **Domain**: Pure business logic, no framework dependencies
- **Application**: Use cases, orchestration
- **Infrastructure**: Symfony, Doctrine, external APIs

```
┌─────────────────────────────────────────────┐
│              Infrastructure                  │
│  ┌───────────────────────────────────────┐  │
│  │           Application                  │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │           Domain                 │  │  │
│  │  │  (Entities, Value Objects,      │  │  │
│  │  │   Domain Services, Events)       │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  (Use Cases, Commands, Queries)       │  │
│  └───────────────────────────────────────┘  │
│  (Controllers, Repositories, APIs)          │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── Domain/
│   ├── Order/
│   │   ├── Entity/
│   │   │   ├── Order.php
│   │   │   └── OrderItem.php
│   │   ├── ValueObject/
│   │   │   ├── OrderId.php
│   │   │   └── Money.php
│   │   ├── Repository/
│   │   │   └── OrderRepositoryInterface.php
│   │   ├── Service/
│   │   │   └── OrderPricingService.php
│   │   └── Event/
│   │       └── OrderCreated.php
│   └── User/
│       └── ...
├── Application/
│   ├── Order/
│   │   ├── Command/
│   │   │   ├── CreateOrder.php
│   │   │   └── CreateOrderHandler.php
│   │   └── Query/
│   │       ├── GetOrder.php
│   │       └── GetOrderHandler.php
│   └── ...
└── Infrastructure/
    ├── Doctrine/
    │   └── Repository/
    │       └── DoctrineOrderRepository.php
    ├── Controller/
    │   └── Api/
    │       └── OrderController.php
    └── External/
        └── PaymentGateway/
            └── StripeAdapter.php
```

## Domain Layer

### Entity (No ORM Annotations)

```php
<?php
// src/Domain/Order/Entity/Order.php

namespace App\Domain\Order\Entity;

use App\Domain\Order\Event\OrderCreated;
use App\Domain\Order\ValueObject\OrderId;
use App\Domain\Order\ValueObject\Money;

final class Order
{
    private array $domainEvents = [];

    /** @var OrderItem[] */
    private array $items = [];

    private function __construct(
        private OrderId $id,
        private int $customerId,
        private OrderStatus $status,
        private \DateTimeImmutable $createdAt,
    ) {}

    public static function create(OrderId $id, int $customerId): self
    {
        $order = new self(
            $id,
            $customerId,
            OrderStatus::PENDING,
            new \DateTimeImmutable(),
        );

        $order->recordEvent(new OrderCreated($id, $customerId));

        return $order;
    }

    public function addItem(int $productId, int $quantity, Money $price): void
    {
        $this->items[] = new OrderItem($productId, $quantity, $price);
    }

    public function getTotal(): Money
    {
        return array_reduce(
            $this->items,
            fn(Money $carry, OrderItem $item) => $carry->add($item->getSubtotal()),
            Money::zero('EUR')
        );
    }

    public function confirm(): void
    {
        if ($this->status !== OrderStatus::PENDING) {
            throw new \DomainException('Only pending orders can be confirmed');
        }

        $this->status = OrderStatus::CONFIRMED;
    }

    private function recordEvent(object $event): void
    {
        $this->domainEvents[] = $event;
    }

    public function pullDomainEvents(): array
    {
        $events = $this->domainEvents;
        $this->domainEvents = [];
        return $events;
    }

    // Getters...
}
```

### Value Object

```php
<?php
// src/Domain/Order/ValueObject/Money.php

namespace App\Domain\Order\ValueObject;

final readonly class Money
{
    private function __construct(
        private int $amount,     // In cents
        private string $currency,
    ) {}

    public static function of(int $amount, string $currency): self
    {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Amount cannot be negative');
        }

        return new self($amount, $currency);
    }

    public static function zero(string $currency): self
    {
        return new self(0, $currency);
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Cannot add different currencies');
        }

        return new self($this->amount + $other->amount, $this->currency);
    }

    public function getAmount(): int
    {
        return $this->amount;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency === $other->currency;
    }
}
```

### Port (Repository Interface)

```php
<?php
// src/Domain/Order/Repository/OrderRepositoryInterface.php

namespace App\Domain\Order\Repository;

use App\Domain\Order\Entity\Order;
use App\Domain\Order\ValueObject\OrderId;

interface OrderRepositoryInterface
{
    public function nextId(): OrderId;
    public function save(Order $order): void;
    public function findById(OrderId $id): ?Order;
    public function findByCustomer(int $customerId): array;
}
```

## Application Layer

### Command

```php
<?php
// src/Application/Order/Command/CreateOrder.php

namespace App\Application\Order\Command;

final readonly class CreateOrder
{
    public function __construct(
        public int $customerId,
        public array $items, // [{productId, quantity, price}]
    ) {}
}
```

### Command Handler

```php
<?php
// src/Application/Order/Command/CreateOrderHandler.php

namespace App\Application\Order\Command;

use App\Domain\Order\Entity\Order;
use App\Domain\Order\Repository\OrderRepositoryInterface;
use App\Domain\Order\ValueObject\Money;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class CreateOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orders,
    ) {}

    public function __invoke(CreateOrder $command): Order
    {
        $order = Order::create(
            $this->orders->nextId(),
            $command->customerId,
        );

        foreach ($command->items as $item) {
            $order->addItem(
                $item['productId'],
                $item['quantity'],
                Money::of($item['price'], 'EUR'),
            );
        }

        $this->orders->save($order);

        return $order;
    }
}
```

## Infrastructure Layer

### Adapter (Doctrine Repository)

```php
<?php
// src/Infrastructure/Doctrine/Repository/DoctrineOrderRepository.php

namespace App\Infrastructure\Doctrine\Repository;

use App\Domain\Order\Entity\Order;
use App\Domain\Order\Repository\OrderRepositoryInterface;
use App\Domain\Order\ValueObject\OrderId;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

final class DoctrineOrderRepository implements OrderRepositoryInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function nextId(): OrderId
    {
        return OrderId::fromString(Uuid::v4()->toRfc4122());
    }

    public function save(Order $order): void
    {
        $this->em->persist($order);
        $this->em->flush();
    }

    public function findById(OrderId $id): ?Order
    {
        return $this->em->find(Order::class, $id->toString());
    }

    public function findByCustomer(int $customerId): array
    {
        return $this->em->getRepository(Order::class)
            ->findBy(['customerId' => $customerId]);
    }
}
```

### Doctrine Mapping (XML)

```xml
<!-- config/doctrine/Order.orm.xml -->
<doctrine-mapping>
    <entity name="App\Domain\Order\Entity\Order" table="orders">
        <id name="id" type="string" length="36">
            <generator strategy="NONE"/>
        </id>
        <field name="customerId" column="customer_id" type="integer"/>
        <field name="status" type="string" enumType="App\Domain\Order\Entity\OrderStatus"/>
        <field name="createdAt" column="created_at" type="datetime_immutable"/>
    </entity>
</doctrine-mapping>
```

### Service Configuration

```yaml
# config/services.yaml
services:
    # Bind interface to implementation
    App\Domain\Order\Repository\OrderRepositoryInterface:
        '@App\Infrastructure\Doctrine\Repository\DoctrineOrderRepository'
```

## Controller (Infrastructure)

```php
<?php
// src/Infrastructure/Controller/Api/OrderController.php

namespace App\Infrastructure\Controller\Api;

use App\Application\Order\Command\CreateOrder;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Messenger\Stamp\HandledStamp;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/orders')]
final class OrderController
{
    public function __construct(
        private MessageBusInterface $bus,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $envelope = $this->bus->dispatch(new CreateOrder(
            customerId: $data['customerId'],
            items: $data['items'],
        ));

        $order = $envelope->last(HandledStamp::class)->getResult();

        return new JsonResponse(['id' => $order->getId()->toString()], 201);
    }
}
```

## Benefits

1. **Testability**: Domain is pure PHP, easily unit tested
2. **Flexibility**: Swap infrastructure without touching domain
3. **Focus**: Domain logic is isolated and explicit
4. **Framework agnostic**: Domain doesn't know about Symfony


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

