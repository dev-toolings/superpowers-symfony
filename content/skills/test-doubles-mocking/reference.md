# Reference

# Test Doubles and Mocking

## Types of Test Doubles

| Type | Purpose |
|------|---------|
| **Dummy** | Passed but never used |
| **Stub** | Returns predetermined values |
| **Mock** | Verifies interactions |
| **Spy** | Records calls for later verification |
| **Fake** | Working implementation (simplified) |

## PHPUnit Mocks

### Basic Mock

```php
<?php

use App\Service\PaymentGateway;
use App\Service\OrderService;
use PHPUnit\Framework\TestCase;

class OrderServiceTest extends TestCase
{
    public function testProcessPayment(): void
    {
        // Create mock
        $gateway = $this->createMock(PaymentGateway::class);

        // Configure return value
        $gateway->method('charge')
            ->willReturn(new PaymentResult(success: true, transactionId: 'tx_123'));

        $service = new OrderService($gateway);
        $result = $service->processPayment(1000, 'EUR');

        $this->assertTrue($result->isSuccessful());
    }
}
```

### Mock with Expectations

```php
public function testChargesCorrectAmount(): void
{
    $gateway = $this->createMock(PaymentGateway::class);

    // Expect specific call
    $gateway->expects($this->once())
        ->method('charge')
        ->with(
            $this->equalTo(1000),
            $this->equalTo('EUR')
        )
        ->willReturn(new PaymentResult(success: true));

    $service = new OrderService($gateway);
    $service->processPayment(1000, 'EUR');
}
```

### Consecutive Returns

```php
public function testRetriesOnFailure(): void
{
    $gateway = $this->createMock(PaymentGateway::class);

    $gateway->expects($this->exactly(2))
        ->method('charge')
        ->willReturnOnConsecutiveCalls(
            new PaymentResult(success: false),  // First call fails
            new PaymentResult(success: true)    // Second succeeds
        );

    $service = new OrderService($gateway);
    $result = $service->processPaymentWithRetry(1000, 'EUR');

    $this->assertTrue($result->isSuccessful());
}
```

### Throwing Exceptions

```php
public function testHandlesGatewayError(): void
{
    $gateway = $this->createMock(PaymentGateway::class);

    $gateway->method('charge')
        ->willThrowException(new GatewayException('Connection timeout'));

    $service = new OrderService($gateway);

    $this->expectException(PaymentFailedException::class);
    $service->processPayment(1000, 'EUR');
}
```

### Callback for Complex Logic

```php
public function testDynamicResponse(): void
{
    $repository = $this->createMock(ProductRepository::class);

    $repository->method('find')
        ->willReturnCallback(function (int $id) {
            if ($id === 1) {
                return new Product(id: 1, name: 'Product 1');
            }
            return null;
        });

    $service = new ProductService($repository);

    $this->assertNotNull($service->getProduct(1));
    $this->assertNull($service->getProduct(999));
}
```

## Prophecy (Alternative)

Prophecy provides a different syntax, often considered more readable.

```php
<?php

use Prophecy\PhpUnit\ProphecyTrait;

class OrderServiceTest extends TestCase
{
    use ProphecyTrait;

    public function testProcessPayment(): void
    {
        // Create prophecy
        $gateway = $this->prophesize(PaymentGateway::class);

        // Stub method
        $gateway->charge(1000, 'EUR')
            ->willReturn(new PaymentResult(success: true));

        // Reveal to get actual mock
        $service = new OrderService($gateway->reveal());

        $result = $service->processPayment(1000, 'EUR');
        $this->assertTrue($result->isSuccessful());
    }

    public function testCallsGatewayOnce(): void
    {
        $gateway = $this->prophesize(PaymentGateway::class);

        // Expect call
        $gateway->charge(1000, 'EUR')
            ->shouldBeCalledOnce()
            ->willReturn(new PaymentResult(success: true));

        $service = new OrderService($gateway->reveal());
        $service->processPayment(1000, 'EUR');
    }
}
```

## Mocking Symfony Services

### EntityManager

```php
public function testPersistsEntity(): void
{
    $em = $this->createMock(EntityManagerInterface::class);

    $em->expects($this->once())
        ->method('persist')
        ->with($this->isInstanceOf(User::class));

    $em->expects($this->once())
        ->method('flush');

    $service = new UserService($em);
    $service->createUser('test@example.com');
}
```

### Repository

```php
public function testFindsUser(): void
{
    $user = new User();
    $user->setEmail('test@example.com');

    $repository = $this->createMock(UserRepository::class);
    $repository->method('findOneByEmail')
        ->with('test@example.com')
        ->willReturn($user);

    $service = new UserService($repository);
    $found = $service->findByEmail('test@example.com');

    $this->assertSame($user, $found);
}
```

### MessageBus

```php
public function testDispatchesMessage(): void
{
    $bus = $this->createMock(MessageBusInterface::class);

    $bus->expects($this->once())
        ->method('dispatch')
        ->with($this->callback(function ($message) {
            return $message instanceof SendWelcomeEmail
                && $message->userId === 123;
        }))
        ->willReturn(new Envelope(new \stdClass()));

    $service = new RegistrationService($bus);
    $service->register(123, 'test@example.com');
}
```

## Partial Mocks

Mock only some methods:

```php
public function testPartialMock(): void
{
    $service = $this->getMockBuilder(OrderService::class)
        ->setConstructorArgs([$this->gateway])
        ->onlyMethods(['sendNotification']) // Only mock this
        ->getMock();

    $service->method('sendNotification')
        ->willReturn(true);

    // Real processPayment, mocked sendNotification
    $service->processPayment(1000, 'EUR');
}
```

## Fakes (Working Implementations)

```php
<?php
// tests/Fake/InMemoryUserRepository.php

class InMemoryUserRepository implements UserRepositoryInterface
{
    private array $users = [];

    public function save(User $user): void
    {
        $this->users[$user->getId()] = $user;
    }

    public function find(int $id): ?User
    {
        return $this->users[$id] ?? null;
    }

    public function findByEmail(string $email): ?User
    {
        foreach ($this->users as $user) {
            if ($user->getEmail() === $email) {
                return $user;
            }
        }
        return null;
    }
}
```

Usage:

```php
public function testCreatesUser(): void
{
    $repository = new InMemoryUserRepository();
    $service = new UserService($repository);

    $user = $service->createUser('test@example.com');

    $this->assertNotNull($repository->findByEmail('test@example.com'));
}
```

## Best Practices

1. **Mock dependencies, not the SUT**: Don't mock the class you're testing
2. **Use interfaces**: Mock interfaces, not concrete classes
3. **One mock assertion per test**: Keep tests focused
4. **Prefer stubs over mocks**: Only verify when behavior matters
5. **Use fakes for repositories**: More realistic tests
6. **Don't over-mock**: Integration tests have value too


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=...
- ./vendor/bin/phpunit
- ./vendor/bin/pest --filter=...

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

