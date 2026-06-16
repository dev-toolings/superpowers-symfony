# Tdd With Phpunit Reference (Symfony)

Use this reference for implementation details and review criteria specific to `tdd-with-phpunit`.

> **Version applicability** — Targets **PHPUnit 10/11** with Symfony 7.4 LTS / 8.x.
> PHPUnit 10+ uses **PHP attributes** (`#[Test]`, `#[DataProvider]`, `#[CoversClass]`)
> — the old `/** @test @dataProvider */` annotations are deprecated/removed.
> `static::getContainer()` replaces legacy `self::$container`. Console test helpers and
> 422 assertions are Symfony 8.1+ where noted.

## The TDD cycle

```
RED  →  write a failing test that expresses the desired behavior
GREEN →  write the minimum code to make it pass
REFACTOR →  improve structure with the test as a safety net (stay green)
```

Repeat per behavior. Never write production code without a failing test first.

## Test base classes

| Base class | Use for |
| --- | --- |
| `TestCase` (PHPUnit) | Pure logic — no kernel, no container, fastest. |
| `KernelTestCase` | Integration — boot kernel, real container/services. |
| `WebTestCase` | Functional — simulate full HTTP requests. |

## Attributes (PHPUnit 10+)

Annotations are out; use attributes:

```php
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\CoversClass;

#[CoversClass(PriceCalculator::class)]
final class PriceCalculatorTest extends TestCase
{
    #[Test]
    public function it_applies_vat(): void
    {
        $calc = new PriceCalculator();
        self::assertSame(120.0, $calc->withVat(100.0, 0.20));
    }

    #[Test]
    #[DataProvider('vatCases')]
    public function it_applies_various_rates(float $net, float $rate, float $expected): void
    {
        self::assertSame($expected, (new PriceCalculator())->withVat($net, $rate));
    }

    public static function vatCases(): \Generator
    {
        yield 'standard'  => [100.0, 0.20, 120.0];
        yield 'reduced'   => [100.0, 0.055, 105.5];
        yield 'zero rate' => [100.0, 0.0, 100.0];
    }
}
```

## RED — write the failing test first

### Unit (no kernel)

```php
#[Test]
public function it_rejects_an_empty_order(): void
{
    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessage('Order must have at least one item');

    (new OrderService($this->createMock(EntityManagerInterface::class)))
        ->createOrder($user, []);
}
```

### Integration (KernelTestCase + real container)

```php
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class OrderServiceTest extends KernelTestCase
{
    #[Test]
    public function it_creates_an_order(): void
    {
        self::bootKernel();
        $service = static::getContainer()->get(OrderService::class);

        $order = $service->createOrder($user, [['productId' => 1, 'quantity' => 2]]);

        self::assertCount(1, $order->getItems());
    }
}
```

## GREEN — minimum code to pass

```php
final class OrderService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function createOrder(User $user, array $items): Order
    {
        if (empty($items)) {
            throw new \InvalidArgumentException('Order must have at least one item');
        }
        // ... build + persist + flush, nothing speculative
        return $order;
    }
}
```

## REFACTOR — stay green

Extract collaborators, introduce value objects, move queries to repositories. Re-run the
suite after each change.

## Mocking services in the test container

In `KernelTestCase`/`WebTestCase` you can swap a real service for a test double via the
test container:

```php
$mock = $this->createMock(NewsRepositoryInterface::class);
$mock->method('findActive')->willReturn([]);

static::getContainer()->set(NewsRepositoryInterface::class, $mock);
```

For **non-shared** services, pass a closure (Symfony 8.1+) so a fresh instance is returned
each time:

```php
static::getContainer()->set(Mailer::class, fn(): Mailer => $mock);
```

> Prefer real services + real DB for repositories (see the `functional-tests` skill).
> Reserve mocks for true external boundaries (HTTP clients, third-party SDKs).

## Testing console commands

Classic approach with `CommandTester`:

```php
use Symfony\Component\Console\Tester\CommandTester;

$command = (new Application(self::$kernel))->find('app:import');
$tester = new CommandTester($command);
$tester->execute(['file' => 'data.csv']);

$tester->assertCommandIsSuccessful();
self::assertStringContainsString('Imported', $tester->getDisplay());
```

Symfony **8.1+** adds a `runCommand()` helper returning an `ExecutionResult`:

```php
final class ImportCommandTest extends KernelTestCase
{
    #[Test]
    public function it_imports(): void
    {
        $result = static::runCommand('app:import data.csv');

        $this->assertCommandIsSuccessful($result);       // 8.1+ assertion
        self::assertStringContainsString('Imported', $result->getDisplay());
    }
}
```

Related console assertions (8.1+): `assertCommandIsSuccessful`, `assertCommandFailed`,
`assertCommandResultEquals`.

## HTTP / form status assertions

When a controller renders an invalid form (Symfony 8.0+ passes the form, not the view),
the response is **HTTP 422**:

```php
#[Test]
public function it_rejects_invalid_submission(): void
{
    $client = static::createClient();
    $client->request('POST', '/register', ['email' => 'not-an-email']);

    $this->assertResponseIsUnprocessable();              // 422
    $this->assertSelectorTextContains('.form-error', 'valid email');
}
```

## Review criteria

- A failing test exists before the production change (RED first).
- Tests use PHPUnit 10+ **attributes** (`#[Test]`, `#[DataProvider]`, `#[CoversClass]`), not annotations.
- Correct base class: `TestCase` (logic) / `KernelTestCase` (services) / `WebTestCase` (HTTP).
- Services fetched via `static::getContainer()`; mocks only at external boundaries.
- Console tests use `runCommand()` + `assertCommandIsSuccessful` (8.1+) or `CommandTester`.
- Invalid form/HTTP cases assert 422 via `assertResponseIsUnprocessable()`.


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
