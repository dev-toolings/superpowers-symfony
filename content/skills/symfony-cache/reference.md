# Reference

# Symfony Cache

## Installation

```bash
composer require symfony/cache
```

## Basic Usage

### Inject Cache

```php
<?php

use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class ProductService
{
    public function __construct(
        private CacheInterface $cache,
    ) {}

    public function getProduct(int $id): Product
    {
        return $this->cache->get("product_{$id}", function (ItemInterface $item) use ($id) {
            $item->expiresAfter(3600); // 1 hour

            return $this->repository->find($id);
        });
    }
}
```

### Delete Cache

```php
$this->cache->delete("product_{$id}");
```

## Configuration

```yaml
# config/packages/cache.yaml
framework:
    cache:
        # Default cache adapter
        app: cache.adapter.redis
        system: cache.adapter.system

        # Define pools
        pools:
            cache.products:
                adapter: cache.adapter.redis
                default_lifetime: 3600

            cache.api_responses:
                adapter: cache.adapter.filesystem
                default_lifetime: 300

            cache.sessions:
                adapter: cache.adapter.redis
                default_lifetime: 86400
```

## Cache Adapters

### Redis

```yaml
# .env
REDIS_URL=redis://localhost:6379

# config/packages/cache.yaml
framework:
    cache:
        app: cache.adapter.redis
        default_redis_provider: '%env(REDIS_URL)%'
```

### Filesystem

```yaml
framework:
    cache:
        app: cache.adapter.filesystem
```

### APCu (In-memory)

```yaml
framework:
    cache:
        app: cache.adapter.apcu
```

### Chained (Multi-tier)

```yaml
framework:
    cache:
        pools:
            cache.products:
                adapters:
                    - cache.adapter.apcu      # Fast, local
                    - cache.adapter.redis     # Shared, persistent
```

## Cache Pools

### Inject Specific Pool

```php
<?php

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;

class ProductService
{
    public function __construct(
        #[Autowire(service: 'cache.products')]
        private CacheInterface $cache,
    ) {}
}
```

### PSR-6 Interface

```php
<?php

use Psr\Cache\CacheItemPoolInterface;

class LegacyService
{
    public function __construct(
        private CacheItemPoolInterface $cache,
    ) {}

    public function getData(string $key): mixed
    {
        $item = $this->cache->getItem($key);

        if (!$item->isHit()) {
            $item->set($this->fetchData());
            $item->expiresAfter(3600);
            $this->cache->save($item);
        }

        return $item->get();
    }
}
```

## Cache Tags

Tags allow invalidating groups of cache items:

```php
<?php

use Symfony\Contracts\Cache\TagAwareCacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class ProductService
{
    public function __construct(
        private TagAwareCacheInterface $cache,
    ) {}

    public function getProduct(int $id): Product
    {
        return $this->cache->get("product_{$id}", function (ItemInterface $item) use ($id) {
            $item->expiresAfter(3600);
            $item->tag(['products', "product_{$id}", "category_{$categoryId}"]);

            return $this->repository->find($id);
        });
    }

    public function getProductsByCategory(int $categoryId): array
    {
        return $this->cache->get("category_{$categoryId}_products", function (ItemInterface $item) use ($categoryId) {
            $item->tag(['products', "category_{$categoryId}"]);

            return $this->repository->findByCategory($categoryId);
        });
    }

    public function invalidateProduct(int $id): void
    {
        // Invalidate specific product
        $this->cache->invalidateTags(["product_{$id}"]);
    }

    public function invalidateCategory(int $categoryId): void
    {
        // Invalidate all products in category
        $this->cache->invalidateTags(["category_{$categoryId}"]);
    }

    public function invalidateAllProducts(): void
    {
        // Invalidate all product caches
        $this->cache->invalidateTags(['products']);
    }
}
```

### Configuration for Tag-Aware Cache

```yaml
framework:
    cache:
        pools:
            cache.products:
                adapter: cache.adapter.redis
                tags: true                       # generic tag support
            # On Redis, prefer the dedicated tag-aware adapter for efficient
            # tag storage and invalidation:
            cache.catalog:
                adapter: cache.adapter.redis_tag_aware
```

`TagAwareCacheInterface::invalidateTags([...])` (shown above) drops every item
carrying one of those tags.

## Early Expiration (anti-stampede)

To avoid a cache stampede when a hot key expires under concurrent load, ask the
callback to recompute *before* expiry. The probabilistic `$beta` (1.0 is a sane
default) decides when a request recomputes early; others keep serving the stale
value.

```php
use Symfony\Contracts\Cache\ItemInterface;

$value = $this->cache->get('home_feed', function (ItemInterface $item) {
    $item->expiresAfter(3600);
    return $this->buildExpensiveFeed();
}, beta: 1.0);
```

For true zero-latency refresh, offload the recompute to Messenger via
`Symfony\Component\Cache\Messenger\EarlyExpirationHandler` + a callback service
implementing `CallbackInterface`, so the early-expiration recomputation runs in
a worker instead of the web request.

## Marshaller per pool (8.1+ — verify)

A pool can serialize/compress its values with a custom marshaller:

```yaml
framework:
    cache:
        pools:
            cache.products:
                adapter: cache.adapter.redis
                tags: true
                # e.g. cache.default_marshaller, or a service compressing/encrypting payloads
                # marshaller: App\Cache\MyMarshaller
```

## HTTP Cache

### Response Caching

```php
<?php

use Symfony\Component\HttpFoundation\Response;

class ProductController
{
    #[Route('/products/{id}')]
    public function show(Product $product): Response
    {
        $response = $this->render('product/show.html.twig', [
            'product' => $product,
        ]);

        // Public cache (CDN, proxy)
        $response->setPublic();
        $response->setMaxAge(3600);
        $response->setSharedMaxAge(3600);

        // ETag for validation
        $response->setEtag(md5($response->getContent()));

        return $response;
    }
}
```

### Cache-Control Headers

```php
$response->headers->set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

// Or using methods
$response->setPublic();
$response->setPrivate();
$response->setMaxAge(3600);       // Browser cache
$response->setSharedMaxAge(3600); // CDN/proxy cache
$response->setExpires(new \DateTime('+1 hour'));
```

## Cache Attributes

```php
<?php

use Symfony\Component\HttpKernel\Attribute\Cache;

class ProductController
{
    #[Route('/products/{id}')]
    #[Cache(public: true, maxage: 3600, smaxage: 3600)]
    public function show(Product $product): Response
    {
        return $this->render('product/show.html.twig', [
            'product' => $product,
        ]);
    }
}
```

## Cache Warmup

```php
<?php
// src/Cache/ProductCacheWarmer.php

use Symfony\Component\HttpKernel\CacheWarmer\CacheWarmerInterface;

class ProductCacheWarmer implements CacheWarmerInterface
{
    public function __construct(
        private ProductRepository $products,
        private CacheInterface $cache,
    ) {}

    public function warmUp(string $cacheDir, ?string $buildDir = null): array
    {
        foreach ($this->products->findPopular(100) as $product) {
            $this->cache->get("product_{$product->getId()}", fn() => $product);
        }

        return [];
    }

    public function isOptional(): bool
    {
        return true;
    }
}
```

## Clear Cache

```bash
# Clear all caches
bin/console cache:clear

# Clear specific pool
bin/console cache:pool:clear cache.products

# Clear by tag
bin/console cache:pool:invalidate-tags cache.products products
```

## Best Practices

1. **Use tags**: For flexible invalidation
2. **Set TTLs**: Don't cache forever
3. **Warm critical caches**: Pre-populate on deploy
4. **Monitor hit rates**: Track cache effectiveness
5. **Chain adapters**: Fast local + shared persistent
6. **Invalidate precisely**: Don't clear everything


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

