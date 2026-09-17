# API Platform Resources Reference (Symfony)

Targets **API Platform v4** (current 4.3). v3.4 deltas are flagged inline. Implementation details + review criteria for `api-platform-resources`.

## Packages (v3/v4 split)

API Platform v2 shipped a monolith `api-platform/core`. **v3/v4 split it into components** — install only what you need:

```bash
composer require api                       # Flex alias → api-platform/symfony stack
composer require api-platform/symfony      # Symfony bridge (HTTP, routing, bundle)
composer require api-platform/doctrine-orm # Doctrine ORM state providers/processors
composer require api-platform/graphql      # GraphQL (optional)
```

v4 requires **PHP 8.2+** and **Symfony 6.4 / 7.x** (LTS target = 7.4). v3.4 has the same component split.

## Operations — explicit declaration

Operation classes live in `ApiPlatform\Metadata`:

```php
<?php
// src/Entity/Book.php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;

#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(),
        new Put(),     // PUT is NOT registered automatically — declare it if you need it
        new Patch(),
        new Delete(),
    ],
)]
class Book
{
    // ...
}
```

### CRITICAL v4 behavior change

> **As soon as you declare ANY operation manually, the auto-registered CRUD is no longer added.**

This means: if you write `operations: [new Get()]`, you get *only* `GET /books/{id}` — no collection, no POST, no DELETE. This prevents accidental exposure. Always declare **every** operation you need.

Item defaults (when you let API Platform auto-register, i.e. no `operations:` key): GET (mandatory), PATCH, DELETE. PUT is **never** auto-registered. Collection defaults: GET (mandatory), POST.

`collectionOperations` / `itemOperations` (v2-era arrays) were removed in v3.0 — fully gone in v4.

### Disabling all routes

```php
#[ApiResource(operations: [])] // model exposed for subrequests/IRIs only, no HTTP routes
class InternalRef {}
```

### Common operation properties

```php
new Get(
    uriTemplate: '/books/{id}',
    requirements: ['id' => '\d+'],
    status: 200,
    routePrefix: '/library',
)
new GetCollection(itemUriTemplate: '/books/{id}') // which op generates item IRIs
```

## OpenAPI — typed objects (v4) vs deprecated array (v3)

`openapiContext` (an array) is **deprecated in v4**. Use the `openapi:` option with typed `OpenApi\Model\*` objects:

```php
<?php

use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model;

#[Post(
    openapi: new Model\Operation(
        summary: 'Create a book',
        description: 'Creates a book and returns the persisted resource.',
        requestBody: new Model\RequestBody(
            content: new \ArrayObject([
                'application/ld+json' => [
                    'schema' => ['type' => 'object', 'properties' => ['title' => ['type' => 'string']]],
                ],
            ]),
        ),
        responses: [
            '201' => new Model\Response(description: 'Book created'),
        ],
    ),
)]
class Book {}
```

Legacy (v3, still parsed but deprecated in v4):

```php
#[ApiProperty(openapiContext: ['type' => 'string', 'example' => 'Foundation'])] // ← deprecated path
```

Hide an operation from the docs:

```php
#[GetCollection(openapi: false)]
```

Decorate the factory for global doc changes — interface `ApiPlatform\OpenApi\Factory\OpenApiFactoryInterface`, service `api_platform.openapi.factory`:

```php
use ApiPlatform\OpenApi\Factory\OpenApiFactoryInterface;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;

#[AsDecorator(decorates: 'api_platform.openapi.factory')]
final class OpenApiFactory implements OpenApiFactoryInterface
{
    public function __construct(private OpenApiFactoryInterface $decorated) {}

    public function __invoke(array $context = []): \ApiPlatform\OpenApi\OpenApi
    {
        $openApi = ($this->decorated)($context);
        return $openApi->withInfo($openApi->getInfo()->withTitle('Library API'));
    }
}
```

Export: `bin/console api:openapi:export [--yaml] [--output=openapi.json] [--spec-version=3.1.0]`.

## Pagination (attributes)

Configured via resource/operation attributes — keys stable v3→v4:

```php
#[ApiResource(
    paginationEnabled: true,
    paginationItemsPerPage: 30,           // default 30
    paginationMaximumItemsPerPage: 100,
    paginationClientEnabled: true,         // allow ?pagination=false
    paginationClientItemsPerPage: true,    // allow ?itemsPerPage=N
)]
#[GetCollection(
    paginationPartial: true,               // skip the COUNT query
    paginationViaCursor: [['field' => 'id', 'direction' => 'DESC']],
    paginationFetchJoinCollection: true,   // Doctrine ORM Paginator for to-many joins
)]
class Book {}
```

Global defaults:

```yaml
# config/packages/api_platform.yaml
api_platform:
    defaults:
        pagination_enabled: true
        pagination_items_per_page: 30
        pagination_maximum_items_per_page: 50
        pagination_client_items_per_page: true
```

Custom paginators return `ApiPlatform\State\Pagination\PaginatorInterface` (or `PartialPaginatorInterface`); helpers `ArrayPaginator` / `TraversablePaginator`. Namespace was `ApiPlatform\Core\DataProvider\*` in v2.

## Validation context

```php
#[Post(validationContext: ['groups' => ['Default', 'postValidation']])]
```

`collectDenormalizationErrors: true` (v4) surfaces type-mismatch errors during deserialization instead of failing on the first one. DELETE is not validated by default.

## Distribution / scaffolding

```bash
api-platform bookshop-api --framework=symfony --with-docker   # installer
# or
symfony new bookshop-api && cd bookshop-api && symfony composer require api
bin/console make:entity --api-resource
```

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
