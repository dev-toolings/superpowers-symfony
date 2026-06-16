# Reference

# TDD with Pest PHP v4 for Symfony

> **Version applicability** — This reference targets **Pest v4** (current, PHP **8.3+**).
> Pest v3 required PHP 8.2; v4 raises the floor to 8.3 and adds **native browser testing**.
>
> ⚠️ **There is no official Symfony Pest plugin.** Pest is built on PHPUnit, so Symfony
> integration is done by using the standard PHPUnit bridge test cases
> (`KernelTestCase` / `WebTestCase`) **inside** Pest tests — not via a
> `pestphp/pest-plugin-symfony` package (that package is not part of the Pest 4
> ecosystem). Any code requiring such a plugin is wrong; use a bridge `TestCase` instead.

## Installation

```bash
# If migrating from a plain PHPUnit setup:
composer remove phpunit/phpunit

composer require pestphp/pest --dev --with-all-dependencies
composer require zenstruck/foundry --dev

# Initialize Pest — generates tests/Pest.php
./vendor/bin/pest --init
```

Useful Pest 4 plugins:

- **`pest-plugin-browser`** — native browser testing (Pest 4 feature).
- **`pest-plugin-drift`** — auto-convert existing PHPUnit test classes to Pest syntax.

```bash
composer require pestphp/pest-plugin-drift --dev   # one-time migration helper
./vendor/bin/pest --drift                          # rewrite PHPUnit tests to Pest
```

## Wiring Symfony into Pest

Bind the Symfony bridge `TestCase` classes to your test directories in `tests/Pest.php`.
This is what replaces a (non-existent) Symfony plugin:

```php
<?php
// tests/Pest.php

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

// Service/integration tests use the kernel container
uses(KernelTestCase::class, Factories::class, ResetDatabase::class)
    ->in('Unit', 'Integration');

// Functional/HTTP tests boot a client
uses(WebTestCase::class, Factories::class, ResetDatabase::class)
    ->in('Functional');
```

Inside a test, `$this` is the bound `TestCase`, so all PHPUnit/Symfony helpers
(`static::getContainer()`, `static::createClient()`, `$this->assertSame(...)`) are available.

> On PHPUnit 10+ / Foundry v2.9+ you can drop the `Factories`/`ResetDatabase` traits and
> instead register `Zenstruck\Foundry\PHPUnit\FoundryExtension` + use the
> `#[ResetDatabase]` attribute — but Pest classes are anonymous, so the trait-based
> wiring above is the simplest path with Pest.

## Test execution

```bash
# Host
./vendor/bin/pest
./vendor/bin/pest --parallel

# Docker
docker compose exec php ./vendor/bin/pest --parallel

# Single file
./vendor/bin/pest tests/Unit/Service/OrderServiceTest.php

# Filter by description
./vendor/bin/pest --filter "creates order"

# Coverage gate
./vendor/bin/pest --coverage --min=80
```

## RED Phase — failure first

Write the test before the implementation. Use Foundry factories for data.

### Unit / integration test (service + real DB)

```php
<?php
// tests/Integration/Service/OrderServiceTest.php

use App\Service\OrderService;
use App\Entity\Order;
use App\Factory\UserFactory;

beforeEach(function () {
    // $this is the KernelTestCase bound in Pest.php
    $this->orderService = static::getContainer()->get(OrderService::class);
});

it('creates an order for a user', function () {
    // Arrange — Foundry v2 returns a REAL User (no ->object())
    $user = UserFactory::createOne(['email' => 'test@example.com']);

    // Act
    $order = $this->orderService->createOrder($user, [
        ['productId' => 1, 'quantity' => 2],
    ]);

    // Assert
    expect($order)
        ->toBeInstanceOf(Order::class)
        ->and($order->getCustomer())->toBe($user)
        ->and($order->getItems())->toHaveCount(1);
});

it('throws for empty items', function () {
    $user = UserFactory::createOne();

    $this->orderService->createOrder($user, []);
})->throws(InvalidArgumentException::class, 'Order must have at least one item');
```

### Functional test (HTTP via WebTestCase)

```php
<?php
// tests/Functional/Api/OrderTest.php

use App\Factory\UserFactory;

it('creates an order via API', function () {
    // Arrange
    $user = UserFactory::createOne(['email' => 'test@example.com']);

    $client = static::createClient();
    $client->loginUser($user);

    // Act
    $client->request('POST', '/api/orders', [], [], [
        'CONTENT_TYPE' => 'application/json',
    ], json_encode([
        'items' => [['productId' => 1, 'quantity' => 2]],
    ]));

    // Assert — mix Symfony assertions and Pest expectations freely
    $this->assertResponseStatusCodeSame(201);
    expect(json_decode($client->getResponse()->getContent(), true))
        ->toHaveKey('id');
});

it('requires authentication', function () {
    $client = static::createClient();
    $client->request('POST', '/api/orders', [], [], [
        'CONTENT_TYPE' => 'application/json',
    ], json_encode(['items' => []]));

    $this->assertResponseStatusCodeSame(401);
});
```

## GREEN Phase — minimal code

Write the simplest code that passes. No speculative extras.

```php
<?php
// src/Service/OrderService.php

final class OrderService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function createOrder(User $user, array $items): Order
    {
        if (empty($items)) {
            throw new \InvalidArgumentException('Order must have at least one item');
        }

        $order = (new Order())
            ->setCustomer($user)
            ->setStatus(OrderStatus::PENDING);

        foreach ($items as $item) {
            $order->addItem(
                (new OrderItem())
                    ->setProductId($item['productId'])
                    ->setQuantity($item['quantity'])
            );
        }

        $this->em->persist($order);
        $this->em->flush();

        return $order;
    }
}
```

## REFACTOR Phase

Once green, improve without changing behavior:

- Extract services from controllers.
- Introduce value objects for complex data.
- Move queries into repository methods.

Re-run `./vendor/bin/pest` after each step — the suite is your safety net.

## Foundry v2 factory (reminder)

```php
<?php
// src/Factory/UserFactory.php

namespace App\Factory;

use App\Entity\User;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/** @extends PersistentObjectFactory<User> */
final class UserFactory extends PersistentObjectFactory
{
    public static function class(): string
    {
        return User::class;
    }

    protected function defaults(): array
    {
        return [
            'email' => self::faker()->unique()->email(),
            'roles' => ['ROLE_USER'],
        ];
    }

    public function admin(): self
    {
        return $this->with(['roles' => ['ROLE_ADMIN']]);
    }
}
```

```php
$user  = UserFactory::createOne();              // real User
$admin = UserFactory::new()->admin()->create();
$users = UserFactory::createMany(5);
$draft = UserFactory::new()->withoutPersisting()->create();
```

## Pest expectations

```php
// Equality / truthiness
expect($value)->toBe($expected);          // strict ===
expect($value)->toEqual($expected);       // loose ==
expect($value)->toBeTrue();
expect($value)->toBeFalse();
expect($value)->toBeNull();
expect($value)->toBeEmpty();

// Types
expect($value)->toBeInstanceOf(Order::class);
expect($value)->toBeArray();
expect($value)->toBeString();
expect($value)->toBeInt();

// Arrays
expect($array)->toHaveCount(3);
expect($array)->toHaveKey('id');
expect($array)->toContain($item);

// Strings
expect($string)->toContain('substring');
expect($string)->toStartWith('prefix');
expect($string)->toMatch('/pattern/');

// Chaining with ->and()
expect($order)
    ->toBeInstanceOf(Order::class)
    ->and($order->getStatus())->toBe(OrderStatus::PENDING)
    ->and($order->getItems())->toHaveCount(2);
```

`describe()` groups related tests; `beforeEach()`/`afterEach()` hooks and datasets
behave as in standard Pest. PHPUnit assertions remain available via `$this->assertSame(...)`.

## Key principles

- Every production change starts with a failing test.
- Use Foundry v2 factories for realistic, persisted test data (real objects, no proxies).
- Functional tests for HTTP, integration/unit tests for services.
- Keep tests deterministic — no random sleeps; seed Faker if needed (`FOUNDRY_FAKER_SEED`).
- One assertion concept per test (chain related `expect()` with `->and()`).
- No official Symfony plugin — wire `KernelTestCase`/`WebTestCase` via `uses()` in `Pest.php`.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/pest --filter=...
- ./vendor/bin/pest
- ./vendor/bin/pest --parallel

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.
