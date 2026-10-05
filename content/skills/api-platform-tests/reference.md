# Reference

# Testing API Platform

> **Versions.** Written for **API Platform 5.0** (Symfony 7.4 LTS / 8.x). It also
> runs on **4.4**, the 4 to 5 bridge release (same features, plus the APIs that
> 5.0 removed), except where flagged. **4.3** is the last release supporting
> **Symfony 6.4 LTS**; **3.4** is unmaintained (legacy). Deltas are flagged
> inline as **5.0**, **4.4+**, **4.3** or **3.4**.

> **Test package (5.0).** `ApiTestCase`, its client and its assertions moved to
> the `api-platform/test` package (`composer require --dev api-platform/test`),
> namespace `ApiPlatform\Test\ApiTestCase`. On **4.4**, **4.3** and **3.4**, use
> `ApiPlatform\Symfony\Bundle\Test\ApiTestCase` (the package exists for 5.x only);
> that old namespace still works in 5.0 but is deprecated and removed in 6.0.
> **5.0** also defaults `ApiTestCase::$alwaysBootKernel` to `false`:
> `createClient()` reuses a kernel that is already booted, so a service replaced
> with `static::getContainer()->set()` before `createClient()` stays replaced.
> The client and assertion API itself is unchanged since v3.

> **Version note.** The examples below use **Zenstruck Foundry v2** (`#[ResetDatabase]` attribute style); see "Foundry v2 reset" for the trait-based PHPUnit 9 fallback.

> **Response keys.** API Platform 4 defaults to `serializer.hydra_prefix: false`,
> so JSON-LD collections expose `member`, `totalItems`, `view` and
> `@type: Collection`. With `hydra_prefix: true` (the v3 behavior) they are
> `hydra:member`, `hydra:totalItems`, `hydra:view`. The default page size is
> 30 (`pagination_items_per_page`); read the configured value rather than
> hardcoding it.

## Setup

```bash
composer require --dev api-platform/symfony   # v4: the test client ships with the Symfony bridge
composer require --dev zenstruck/foundry
composer require --dev dama/doctrine-test-bundle  # transactional rollback between tests
```

## Basic API Tests

### Test Collection

```php
<?php
// tests/Functional/Api/ProductTest.php

namespace App\Tests\Functional\Api;

use ApiPlatform\Test\ApiTestCase; // 4.x: ApiPlatform\Symfony\Bundle\Test\ApiTestCase
use App\Tests\Factory\ProductFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ProductTest extends ApiTestCase
{
    use Factories;
    use ResetDatabase;

    public function testGetCollection(): void
    {
        ProductFactory::createMany(40);

        $response = static::createClient()->request('GET', '/api/products');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('content-type', 'application/ld+json; charset=utf-8');
        $this->assertJsonContains([
            '@context' => '/api/contexts/Product',
            '@type' => 'Collection',
            'totalItems' => 40,
        ]);
        $this->assertCount(30, $response->toArray()['member']); // Default pagination: 30 per page
    }

    public function testGetItem(): void
    {
        $product = ProductFactory::createOne(['name' => 'Test Product']);

        $response = static::createClient()->request(
            'GET',
            '/api/products/' . $product->getId()
        );

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains([
            '@type' => 'Product',
            'name' => 'Test Product',
        ]);
    }

    public function testGetItemNotFound(): void
    {
        static::createClient()->request('GET', '/api/products/999999');

        $this->assertResponseStatusCodeSame(404);
    }
}
```

### Test Create

```php
public function testCreateProduct(): void
{
    $response = static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
            'description' => 'A great product',
        ],
    ]);

    $this->assertResponseStatusCodeSame(201);
    $this->assertResponseHeaderSame('content-type', 'application/ld+json; charset=utf-8');
    $this->assertJsonContains([
        '@type' => 'Product',
        'name' => 'New Product',
        'price' => 1999,
    ]);
    $this->assertMatchesResourceItemJsonSchema(Product::class);
}

public function testCreateProductValidation(): void
{
    static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => '', // Invalid: empty
            'price' => -100, // Invalid: negative
        ],
    ]);

    $this->assertResponseStatusCodeSame(422);
    $this->assertJsonContains([
        '@type' => 'ConstraintViolationList',
    ]);
}
```

### Test Update

```php
public function testUpdateProduct(): void
{
    $product = ProductFactory::createOne(['name' => 'Old Name']);

    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'json' => [
            'name' => 'New Name',
            'price' => $product->getPrice(),
        ],
    ]);

    $this->assertResponseIsSuccessful();
    $this->assertJsonContains(['name' => 'New Name']);
}

public function testPatchProduct(): void
{
    $product = ProductFactory::createOne(['name' => 'Old Name']);

    static::createClient()->request('PATCH', '/api/products/' . $product->getId(), [
        'headers' => ['Content-Type' => 'application/merge-patch+json'],
        'json' => ['name' => 'Patched Name'],
    ]);

    $this->assertResponseIsSuccessful();
    $this->assertJsonContains(['name' => 'Patched Name']);
}
```

### Test Delete

```php
public function testDeleteProduct(): void
{
    $product = ProductFactory::createOne();

    static::createClient()->request('DELETE', '/api/products/' . $product->getId());

    $this->assertResponseStatusCodeSame(204);

    // Verify deleted
    static::createClient()->request('GET', '/api/products/' . $product->getId());
    $this->assertResponseStatusCodeSame(404);
}
```

## Testing with Authentication

```php
public function testAuthenticatedUserCanCreate(): void
{
    $user = UserFactory::createOne();

    static::createClient()->request('POST', '/api/products', [
        'auth_bearer' => $this->getToken($user),
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
        ],
    ]);

    $this->assertResponseStatusCodeSame(201);
}

public function testUnauthenticatedUserCannotCreate(): void
{
    static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
        ],
    ]);

    $this->assertResponseStatusCodeSame(401);
}

public function testOnlyOwnerCanUpdate(): void
{
    $owner = UserFactory::createOne();
    $otherUser = UserFactory::createOne();
    $product = ProductFactory::createOne(['owner' => $owner]);

    // Owner can update
    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'auth_bearer' => $this->getToken($owner),
        'json' => ['name' => 'Updated'],
    ]);
    $this->assertResponseIsSuccessful();

    // Other user cannot
    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'auth_bearer' => $this->getToken($otherUser),
        'json' => ['name' => 'Hacked'],
    ]);
    $this->assertResponseStatusCodeSame(403);
}
```

## Testing Filters

```php
public function testSearchFilter(): void
{
    ProductFactory::createOne(['name' => 'Apple iPhone']);
    ProductFactory::createOne(['name' => 'Samsung Galaxy']);
    ProductFactory::createOne(['name' => 'Apple iPad']);

    $response = static::createClient()->request('GET', '/api/products?name=Apple');

    $this->assertResponseIsSuccessful();
    $this->assertCount(2, $response->toArray()['member']);
}

public function testRangeFilter(): void
{
    ProductFactory::createOne(['price' => 500]);
    ProductFactory::createOne(['price' => 1500]);
    ProductFactory::createOne(['price' => 3000]);

    $response = static::createClient()->request(
        'GET',
        '/api/products?price[gte]=1000&price[lte]=2000'
    );

    $this->assertResponseIsSuccessful();
    $this->assertCount(1, $response->toArray()['member']);
}

public function testOrderFilter(): void
{
    ProductFactory::createOne(['name' => 'Zebra']);
    ProductFactory::createOne(['name' => 'Apple']);
    ProductFactory::createOne(['name' => 'Banana']);

    $response = static::createClient()->request('GET', '/api/products?order[name]=asc');

    $this->assertResponseIsSuccessful();
    $data = $response->toArray()['member'];
    $this->assertEquals('Apple', $data[0]['name']);
    $this->assertEquals('Banana', $data[1]['name']);
    $this->assertEquals('Zebra', $data[2]['name']);
}
```

## Testing Pagination

```php
public function testPagination(): void
{
    ProductFactory::createMany(50);

    // First page
    $response = static::createClient()->request('GET', '/api/products');
    $data = $response->toArray();

    $this->assertCount(30, $data['member']); // Default per page
    $this->assertEquals(50, $data['totalItems']);
    $this->assertArrayHasKey('view', $data);
    $this->assertArrayHasKey('next', $data['view']);

    // Second page
    $response = static::createClient()->request('GET', '/api/products?page=2');
    $data = $response->toArray();

    $this->assertCount(20, $data['member']); // 50 - 30 on the second page
}

public function testCustomItemsPerPage(): void
{
    ProductFactory::createMany(20);

    $response = static::createClient()->request('GET', '/api/products?itemsPerPage=5');
    $data = $response->toArray();

    $this->assertCount(5, $data['member']);
}
```

## Testing Schema

```php
public function testResponseMatchesSchema(): void
{
    ProductFactory::createOne();

    static::createClient()->request('GET', '/api/products');

    $this->assertMatchesResourceCollectionJsonSchema(Product::class);
}

public function testItemMatchesSchema(): void
{
    $product = ProductFactory::createOne();

    static::createClient()->request('GET', '/api/products/' . $product->getId());

    $this->assertMatchesResourceItemJsonSchema(Product::class);
}
```

## Foundry v2 reset

Foundry v2 factories return **real objects** (no Proxy), and the database reset is exposed both as a trait and a PHPUnit 10+ attribute:

```php
use ApiPlatform\Test\ApiTestCase; // 4.x: ApiPlatform\Symfony\Bundle\Test\ApiTestCase
use Zenstruck\Foundry\Attribute\ResetDatabase; // PHPUnit 10+ / Foundry 2.9
use Zenstruck\Foundry\Test\Factories;

#[ResetDatabase]
final class ProductTest extends ApiTestCase
{
    use Factories;
    // ...
}
```

PHPUnit 9 fallback: `use Zenstruck\Foundry\Test\ResetDatabase;` + `use Zenstruck\Foundry\Test\Factories;` traits. `DAMADoctrineTestBundle` wraps each test in a rolled-back transaction (no truncation needed).

## Asserting denormalization errors (v4)

> **5.0 changed the default status.** A type error on a property that carries a
> Validator constraint now returns **422** with a `ConstraintViolation` payload,
> where **4.4** and earlier return **400** with an `Error` payload. Properties
> without constraints still return 400. A Doctrine
> `UniqueConstraintViolationException` also maps to 422 by default in 5.0.
> Tests that assert 400 on such payloads must be updated when upgrading.

When a resource sets `collectDenormalizationErrors: true`, a payload with type mismatches returns **422** with every offending field collected (rather than failing on the first one). Assert the violation list:

```php
public function testTypeMismatchCollectsAllErrors(): void
{
    static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => 123,        // expected string
            'price' => 'free',    // expected int
        ],
    ]);

    $this->assertResponseStatusCodeSame(422);
    $this->assertJsonContains(['@type' => 'ConstraintViolationList']);
}
```

## Best Practices

1. **Use Foundry factories**: Consistent test data
2. **Reset database**: Use `ResetDatabase` trait
3. **Test both success and failure**: Validation, auth, not found
4. **Test filters and pagination**: These are common API features
5. **Schema assertions**: Verify response structure
6. **Authentication tests**: Test both authenticated and anonymous

## Validation commands
- ./vendor/bin/phpunit --filter=Api
- ./vendor/bin/phpunit --list-tests
- php bin/console debug:router
