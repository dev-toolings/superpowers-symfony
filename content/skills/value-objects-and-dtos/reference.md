# Reference

# Value Objects and DTOs in Symfony

## Value Objects

Value Objects are immutable objects defined by their attributes, not identity.

### Money Value Object

```php
<?php
// src/Domain/ValueObject/Money.php

namespace App\Domain\ValueObject;

final readonly class Money
{
    private function __construct(
        private int $amount,      // In cents
        private string $currency,
    ) {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Amount cannot be negative');
        }
        if (strlen($currency) !== 3) {
            throw new \InvalidArgumentException('Currency must be ISO 4217 code');
        }
    }

    public static function of(int $amount, string $currency): self
    {
        return new self($amount, strtoupper($currency));
    }

    public static function EUR(int $amount): self
    {
        return new self($amount, 'EUR');
    }

    public static function zero(string $currency = 'EUR'): self
    {
        return new self(0, strtoupper($currency));
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);
        return new self($this->amount - $other->amount, $this->currency);
    }

    public function multiply(float $multiplier): self
    {
        return new self((int) round($this->amount * $multiplier), $this->currency);
    }

    public function getAmount(): int
    {
        return $this->amount;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function format(): string
    {
        return number_format($this->amount / 100, 2) . ' ' . $this->currency;
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency === $other->currency;
    }

    public function isGreaterThan(self $other): bool
    {
        $this->assertSameCurrency($other);
        return $this->amount > $other->amount;
    }

    public function isZero(): bool
    {
        return $this->amount === 0;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException(
                "Cannot operate on different currencies: {$this->currency} vs {$other->currency}"
            );
        }
    }
}
```

### Email Value Object

```php
<?php
// src/Domain/ValueObject/Email.php

namespace App\Domain\ValueObject;

final readonly class Email
{
    private function __construct(
        private string $value,
    ) {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Invalid email: {$value}");
        }
    }

    public static function fromString(string $email): self
    {
        return new self(strtolower(trim($email)));
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function getDomain(): string
    {
        return substr($this->value, strpos($this->value, '@') + 1);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

### Address Value Object

```php
<?php
// src/Domain/ValueObject/Address.php

namespace App\Domain\ValueObject;

final readonly class Address
{
    public function __construct(
        public string $street,
        public string $city,
        public string $postalCode,
        public string $country,
        public ?string $state = null,
    ) {
        if (empty($street) || empty($city) || empty($postalCode) || empty($country)) {
            throw new \InvalidArgumentException('Address fields cannot be empty');
        }
    }

    public function withStreet(string $street): self
    {
        return new self($street, $this->city, $this->postalCode, $this->country, $this->state);
    }

    public function format(): string
    {
        $parts = [$this->street, $this->postalCode . ' ' . $this->city];

        if ($this->state) {
            $parts[] = $this->state;
        }

        $parts[] = $this->country;

        return implode("\n", $parts);
    }

    public function equals(self $other): bool
    {
        return $this->street === $other->street
            && $this->city === $other->city
            && $this->postalCode === $other->postalCode
            && $this->country === $other->country
            && $this->state === $other->state;
    }
}
```

## Doctrine Embeddables

Store Value Objects in database:

```php
<?php
// src/Domain/ValueObject/Money.php

use Doctrine\ORM\Mapping as ORM;

#[ORM\Embeddable]
final readonly class Money
{
    #[ORM\Column(type: 'integer')]
    private int $amount;

    #[ORM\Column(type: 'string', length: 3)]
    private string $currency;

    // ... rest of class
}

// src/Entity/Order.php

#[ORM\Entity]
class Order
{
    #[ORM\Embedded(class: Money::class)]
    private Money $total;

    public function getTotal(): Money
    {
        return $this->total;
    }
}
```

## DTOs (Data Transfer Objects)

DTOs carry data between layers without behavior.

### Input DTO

```php
<?php
// src/Dto/CreateOrderInput.php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateOrderInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public int $customerId,

        #[Assert\NotBlank]
        #[Assert\Count(min: 1, minMessage: 'Order must have at least one item')]
        #[Assert\Valid]
        public array $items,

        #[Assert\Length(max: 20)]
        public ?string $couponCode = null,
    ) {}
}

// src/Dto/OrderItemInput.php

final readonly class OrderItemInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public int $productId,

        #[Assert\NotBlank]
        #[Assert\Positive]
        #[Assert\LessThanOrEqual(100)]
        public int $quantity,
    ) {}
}
```

### Output DTO

```php
<?php
// src/Dto/OrderOutput.php

namespace App\Dto;

use App\Entity\Order;

final readonly class OrderOutput
{
    public function __construct(
        public string $id,
        public int $customerId,
        public array $items,
        public MoneyOutput $total,
        public string $status,
        public string $createdAt,
    ) {}

    public static function fromEntity(Order $order): self
    {
        return new self(
            id: $order->getId(),
            customerId: $order->getCustomer()->getId(),
            items: array_map(
                fn($item) => OrderItemOutput::fromEntity($item),
                $order->getItems()->toArray()
            ),
            total: MoneyOutput::fromValueObject($order->getTotal()),
            status: $order->getStatus()->value,
            createdAt: $order->getCreatedAt()->format('c'),
        );
    }
}

// src/Dto/MoneyOutput.php

final readonly class MoneyOutput
{
    public function __construct(
        public int $amount,
        public string $currency,
        public string $formatted,
    ) {}

    public static function fromValueObject(Money $money): self
    {
        return new self(
            amount: $money->getAmount(),
            currency: $money->getCurrency(),
            formatted: $money->format(),
        );
    }
}
```

### API Platform Integration

```php
<?php
// src/Entity/Order.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Dto\CreateOrderInput;
use App\Dto\OrderOutput;

#[ApiResource(
    operations: [
        new Post(
            input: CreateOrderInput::class,
            output: OrderOutput::class,
            processor: CreateOrderProcessor::class,
        ),
    ],
)]
class Order { /* ... */ }
```

## Serializer Attributes

Prefer attributes on the DTO over external mapping files. The attributes live in
the `Symfony\Component\Serializer\Attribute\*` namespace (renamed from the old
`Annotation\*` namespace in Symfony 7.0):

```php
<?php

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Serializer\Attribute\Ignore;

final readonly class OrderOutput
{
    public function __construct(
        #[Groups(['order:read'])]
        public string $id,

        #[Groups(['order:read'])]
        #[SerializedName('customer_id')]
        public int $customerId,

        #[Ignore]
        public ?string $internalNote = null,
    ) {}
}
```

## Serializer Configuration (mapping files)

```yaml
# config/packages/serializer.yaml
framework:
    serializer:
        mapping:
            paths:
                - '%kernel.project_dir%/config/serializer'
```

```yaml
# config/serializer/Money.yaml
App\Domain\ValueObject\Money:
    attributes:
        amount:
            groups: ['read']
        currency:
            groups: ['read']
```

## Best Practices

1. **Value Objects are immutable**: Return new instances
2. **Validate in constructor**: Fail fast
3. **Use readonly**: `readonly` properties (PHP 8.1+) or whole `readonly class` (PHP 8.2+)
4. **Equality by value**: Implement equals() method
5. **DTOs are simple**: No behavior, just data
6. **Separate Input/Output**: Different validation needs
7. **Use Embeddables**: Store VOs in database naturally


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

