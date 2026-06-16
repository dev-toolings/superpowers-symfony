# Functional Tests Reference (Symfony)

Use this reference for implementation details and review criteria specific to `functional-tests`.

> **Version applicability** — Targets Symfony 7.4 LTS / 8.x with PHPUnit 10/11.
> `static::getContainer()` is the modern container accessor (not legacy `self::$container`);
> `assertResponseIsUnprocessable` (422) and `assertSessionHasFlashMessage` (8.1+) are recent.

## Setup

```bash
composer require --dev symfony/test-pack
php bin/phpunit
```

Flex creates `phpunit.dist.xml` and `tests/bootstrap.php`. Test env files:
`.env` → `.env.test` (committed) → `.env.test.local` (gitignored). `.env.local` is **not**
loaded in the test env.

## Test base classes

| Base class | Use for |
| --- | --- |
| `TestCase` (PHPUnit) | Pure unit tests, no kernel. |
| `KernelTestCase` | Integration — boot the kernel, use the **real** container & services. |
| `WebTestCase` | Functional/application — simulate HTTP requests through the kernel. |

```php
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HomeControllerTest extends WebTestCase
{
    public function testHomepageIsSuccessful(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Hello World');
    }
}
```

> `static::createClient()` boots the kernel internally — do **not** call `bootKernel()`
> first, or you'll get a "kernel already booted" error.

## Accessing services (private services in test)

In the test env the container exposes a special test container where **private** services
are reachable via `static::getContainer()`:

```php
final class NewsletterTest extends KernelTestCase
{
    public function testGenerate(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        $generator = $container->get(NewsletterGenerator::class);
        self::assertNotEmpty($generator->generate());
    }
}
```

The kernel reboots between tests. Configure test-only behavior under
`config/packages/test/` or with `when@test`.

## Client API

```php
$client = static::createClient();

$crawler = $client->request('GET', '/');
$client->request($method, $uri, $parameters = [], $files = [], $server = [], $content = null);
$client->xmlHttpRequest('POST', '/submit', ['name' => 'Fabien']);   // AJAX

$client->followRedirect();          // or followRedirects() to auto-follow
$client->back(); $client->forward(); $client->reload();
$client->disableReboot();           // reset instead of reboot between requests
$client->enableProfiler();          // collect profiler data for HttpClient/mailer asserts
$client->catchExceptions(false);    // let exceptions bubble for debugging
```

## Authentication

Prefer the `loginUser()` helper over crafting login form requests:

```php
$user = $userRepository->findOneByEmail('admin@example.com');
$client->loginUser($user);                 // default firewall
$client->loginUser($user, 'main');         // explicit firewall
```

For lightweight cases, an in-memory user + a `when@test` security provider works too:

```php
$client->loginUser(new InMemoryUser('admin', 'password', ['ROLE_ADMIN']));
```

## Crawler & forms

```php
$client->clickLink('Add comment');
$client->submitForm('Add comment', ['comment[text]' => 'Nice!']);

$form = $crawler->selectButton('Submit')->form();
$form['contact[subject]'] = 'Hello';
$form['contact[category]']->select('support');
$form['contact[agree]']->tick();
$form['contact[file]']->upload('/path/to/file.pdf');
$client->submit($form);
```

## Assertions

```php
// Response
$this->assertResponseIsSuccessful();                 // 2xx
$this->assertResponseStatusCodeSame(201);
$this->assertResponseRedirects('/login', 302);
$this->assertResponseHasHeader('Content-Type');
$this->assertResponseHeaderSame('Content-Type', 'application/json');
$this->assertResponseHasCookie('session');
$this->assertResponseIsUnprocessable();              // 422 — invalid form (Symfony 8.0 Turbo)

// Request / routing
$this->assertRouteSame('app_home');
$this->assertRequestAttributeValueSame('_route', 'app_home');
$this->assertSessionHasFlashMessage('success');      // 8.1+

// DOM
$this->assertSelectorExists('.alert');
$this->assertSelectorNotExists('.error');
$this->assertSelectorCount(3, 'li.item');
$this->assertSelectorTextContains('h1', 'Title');
$this->assertSelectorTextSame('h1', 'Exact Title');
$this->assertPageTitleContains('Dashboard');
$this->assertInputValueSame('email', 'a@b.com');
$this->assertCheckboxChecked('agree');

// Mailer (needs the kernel mailer)
$this->assertEmailCount(1);
$this->assertQueuedEmailCount(1);
$email = $this->getMailerMessage();
$this->assertEmailSubjectContains($email, 'Welcome');
$this->assertEmailHtmlBodyContains($email, 'Confirm');
```

## Database in functional tests

Use a **real database** with real repositories — repositories are meant to be tested
against a real connection, not mocked. Mocking the EM/repository sacrifices coverage of
the actual query behavior.

```bash
# one-time test DB setup
php bin/console --env=test doctrine:database:create
php bin/console --env=test doctrine:schema:create
```

### Transactional rollback per test — DAMADoctrineTestBundle

```bash
composer require --dev dama/doctrine-test-bundle
```

```xml
<!-- phpunit.dist.xml -->
<extensions>
    <bootstrap class="DAMA\DoctrineTestBundle\PHPUnit\PHPUnitExtension"/>
</extensions>
```

Each test runs inside a transaction that is **rolled back** at the end — fast, isolated,
no manual cleanup. Combine with Foundry's reset/`#[ResetDatabase]` (see the
`doctrine-fixtures-foundry` skill) for fixtures.

### Repository test pattern (KernelTestCase + real DB)

```php
final class ProductRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine')->getManager();
    }

    public function testFindByName(): void
    {
        $product = $this->em->getRepository(Product::class)
            ->findOneBy(['name' => 'Widget']);

        self::assertSame(14.50, $product->getPrice());
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->em->close();   // avoid memory leaks across tests
        unset($this->em);
    }
}
```

## Smoke tests (best practice)

Cheap, high-value: assert that key URLs return a successful (or expected) status. Use
**hardcoded URLs**, not the router — a smoke test should fail if a route URL silently
changes.

```php
/**
 * @dataProvider provideUrls
 */
public function testPageIsSuccessful(string $url): void
{
    $client = static::createClient();
    $client->request('GET', $url);

    $this->assertResponseIsSuccessful();
}

public static function provideUrls(): \Generator
{
    yield ['/'];
    yield ['/about'];
    yield ['/contact'];
}
```

## Review criteria

- Functional tests use `WebTestCase` + `static::createClient()`; integration uses `KernelTestCase`.
- Real DB + real repositories (no mocked EM/repository) for data-touching tests.
- DAMADoctrineTestBundle (or Foundry reset) provides per-test isolation.
- Invalid form submissions assert **422** via `assertResponseIsUnprocessable()` (Symfony 8.0+).
- Auth via `loginUser()`, not by replaying the login form.
- Smoke tests cover key URLs with hardcoded paths.


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
