# Reference

# API Platform Versioning

> **Official recommendation (v3 & v4): prefer DEPRECATION over versioning.** API Platform's guidance is to evolve a single API and deprecate fields/operations with a sunset window, rather than maintaining parallel `/v1`, `/v2` surfaces. Reach for path versioning only when a breaking representation change genuinely cannot be expressed through deprecation + groups. Start at the "Deprecation (recommended)" section below; the multi-version strategies after it are the fallback.

## Deprecation (recommended)

### `deprecationReason`

Marks a resource, operation, or property as deprecated. Rendered in JSON-LD/Hydra, GraphQL, and OpenAPI (Swagger UI / GraphiQL):

```php
<?php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\Get;

#[ApiResource(deprecationReason: 'Use the Book resource instead.')]
#[Get(deprecationReason: 'Retrieve a Book instead.')]
class Parchment
{
    #[ApiProperty(deprecationReason: 'Use the rating property instead.')]
    public int $score;
}
```

### Sunset header (RFC 8594)

Tell consumers when the resource will be removed. The string is converted to a valid HTTP date:

```php
#[ApiResource(
    deprecationReason: 'Create a Book instead.',
    sunset: '2026-12-31',
)]
class Parchment {}
```

### Deprecation header (RFC 9745) — NEW in v4

v4 can emit the standardized `Deprecation` HTTP header (RFC 9745) — set via the operation `headers` option (Unix timestamps + optional documentation links):

```php
use ApiPlatform\Metadata\Get;

#[Get(
    deprecationReason: 'Use /books/{id} instead.',
    sunset: '2026-12-31',
    headers: [
        'Deprecation' => '@1767225600',   // RFC 9745: timestamp the resource became deprecated
        'Link' => '</books/{id}>; rel="successor-version"',
    ],
)]
class Parchment {}
```

> Both `deprecationReason` and `sunset` are stable v3→v4. The RFC 9745 `Deprecation` header support is **v4-era**. (For pre-v4 codebases, emit `Deprecation`/`Sunset`/`Link` from a kernel response listener — see the listener pattern in the multi-version section.)

---

## Path versioning (fallback strategy)

Only when deprecation cannot express the change. The patterns below maintain multiple representations in parallel.

## Versioning Strategies

### 1. URI Versioning

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;

// Version 1
#[ApiResource(
    uriTemplate: '/v1/products',
    shortName: 'Product',
    operations: [
        new GetCollection(uriTemplate: '/v1/products'),
        new Get(uriTemplate: '/v1/products/{id}'),
    ],
    normalizationContext: ['groups' => ['product:read:v1']],
)]

// Version 2 - same entity, different representation
#[ApiResource(
    uriTemplate: '/v2/products',
    shortName: 'ProductV2',
    operations: [
        new GetCollection(uriTemplate: '/v2/products'),
        new Get(uriTemplate: '/v2/products/{id}'),
    ],
    normalizationContext: ['groups' => ['product:read:v2']],
)]
class Product
{
    #[Groups(['product:read:v1', 'product:read:v2'])]
    private ?int $id = null;

    #[Groups(['product:read:v1', 'product:read:v2'])]
    private string $name;

    // V1: price in cents as integer
    #[Groups(['product:read:v1'])]
    private int $price;

    // V2: price as Money object
    #[Groups(['product:read:v2'])]
    private Money $priceAmount;

    // V2 only: new field
    #[Groups(['product:read:v2'])]
    private ?string $sku = null;
}
```

### 2. Separate DTOs per Version

```php
<?php
// src/Dto/V1/ProductOutput.php

namespace App\Dto\V1;

final class ProductOutput
{
    public function __construct(
        public int $id,
        public string $name,
        public int $price, // Cents
    ) {}
}

// src/Dto/V2/ProductOutput.php

namespace App\Dto\V2;

final class ProductOutput
{
    public function __construct(
        public int $id,
        public string $name,
        public array $price, // {amount: 1999, currency: 'EUR'}
        public ?string $sku,
        public array $metadata,
    ) {}
}
```

```php
<?php
// src/Entity/Product.php

use App\Dto\V1\ProductOutput as ProductOutputV1;
use App\Dto\V2\ProductOutput as ProductOutputV2;

#[ApiResource(
    uriTemplate: '/v1/products',
    operations: [
        new Get(
            uriTemplate: '/v1/products/{id}',
            output: ProductOutputV1::class,
            provider: ProductV1Provider::class,
        ),
    ],
)]
#[ApiResource(
    uriTemplate: '/v2/products',
    operations: [
        new Get(
            uriTemplate: '/v2/products/{id}',
            output: ProductOutputV2::class,
            provider: ProductV2Provider::class,
        ),
    ],
)]
class Product { /* ... */ }
```

### 3. Header-Based Versioning

```php
<?php
// src/State/VersionedProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class VersionedProductProvider implements ProviderInterface
{
    public function __construct(
        private ProviderInterface $itemProvider,
        private RequestStack $requestStack,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $product = $this->itemProvider->provide($operation, $uriVariables, $context);

        if (!$product) {
            return null;
        }

        $request = $this->requestStack->getCurrentRequest();
        $version = $request?->headers->get('X-API-Version', 'v2');

        return match ($version) {
            'v1' => $this->transformToV1($product),
            'v2' => $this->transformToV2($product),
            default => $this->transformToV2($product),
        };
    }

    private function transformToV1(Product $product): ProductOutputV1
    {
        return new ProductOutputV1(
            id: $product->getId(),
            name: $product->getName(),
            price: $product->getPrice(),
        );
    }

    private function transformToV2(Product $product): ProductOutputV2
    {
        return new ProductOutputV2(
            id: $product->getId(),
            name: $product->getName(),
            price: [
                'amount' => $product->getPrice(),
                'currency' => 'EUR',
            ],
            sku: $product->getSku(),
            metadata: $product->getMetadata(),
        );
    }
}
```

## Deprecation on a versioned endpoint

### Mark Deprecated Operations

```php
use ApiPlatform\OpenApi\Model;

#[ApiResource(
    operations: [
        // Deprecated v1 endpoint
        new Get(
            uriTemplate: '/v1/products/{id}',
            deprecationReason: 'Use /v2/products/{id} instead. Will be removed in 2026.',
            sunset: '2026-12-31',
            // v4: typed OpenApi\Model\Operation (openapiContext array is deprecated in v4)
            openapi: new Model\Operation(deprecated: true),
        ),
        // Current v2 endpoint
        new Get(
            uriTemplate: '/v2/products/{id}',
        ),
    ],
)]
class Product { /* ... */ }
```

### Sunset / Deprecation headers via a response listener (pre-v4 fallback)

On v4, prefer the operation `headers` option (RFC 9745, shown in "Deprecation (recommended)"). On older versions, emit the headers from a listener:

```php
<?php
// src/EventSubscriber/DeprecationSubscriber.php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class DeprecationSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => 'onResponse',
        ];
    }

    public function onResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $path = $request->getPathInfo();

        // Add sunset header for v1 endpoints
        if (str_starts_with($path, '/api/v1/')) {
            $response = $event->getResponse();
            $response->headers->set('Sunset', 'Sat, 01 Jan 2025 00:00:00 GMT');
            $response->headers->set('Deprecation', 'true');
            $response->headers->set(
                'Link',
                '</api/v2' . substr($path, 7) . '>; rel="successor-version"'
            );
        }
    }
}
```

## Migration Guide Pattern

```php
<?php
// src/Dto/V2/ProductOutput.php

namespace App\Dto\V2;

/**
 * Product representation (API v2)
 *
 * Changes from v1:
 * - `price` is now an object with `amount` and `currency`
 * - Added `sku` field
 * - Added `metadata` field
 * - Removed `priceInCents` (use `price.amount`)
 */
final class ProductOutput
{
    // ...
}
```

## Routing Configuration

```yaml
# config/routes/api_platform.yaml
api_platform:
    resource: .
    type: api_platform
    prefix: /api
```

## Testing Multiple Versions

```php
public function testV1ReturnsLegacyFormat(): void
{
    $product = ProductFactory::createOne(['price' => 1999]);

    $response = $this->client->request('GET', '/api/v1/products/' . $product->getId());

    $this->assertResponseIsSuccessful();
    $data = $response->toArray();

    // V1 format: price as integer
    $this->assertIsInt($data['price']);
    $this->assertEquals(1999, $data['price']);
}

public function testV2ReturnsNewFormat(): void
{
    $product = ProductFactory::createOne(['price' => 1999]);

    $response = $this->client->request('GET', '/api/v2/products/' . $product->getId());

    $this->assertResponseIsSuccessful();
    $data = $response->toArray();

    // V2 format: price as object
    $this->assertIsArray($data['price']);
    $this->assertEquals(1999, $data['price']['amount']);
    $this->assertEquals('EUR', $data['price']['currency']);
}
```

## Best Practices

1. **URI versioning** for major changes - clearest for consumers
2. **Groups for minor changes** - add fields without new version
3. **Set sunset dates** - give consumers time to migrate
4. **Document changes** - changelog per version
5. **Test all versions** - maintain test coverage
6. **Limit active versions** - max 2-3 at a time


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=Api
- ./vendor/bin/phpstan analyse
- php bin/console debug:router

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

