# API Platform Resources Reference (Symfony)

> **Versions.** Written for **API Platform 5.0** (Symfony 7.4 LTS / 8.x). It also
> runs on **4.4**, the 4 to 5 bridge release (same features, plus the APIs that
> 5.0 removed), except where flagged. **4.3** is the last release supporting
> **Symfony 6.4 LTS**; **3.4** is unmaintained (legacy). Deltas are flagged
> inline as **5.0**, **4.4+**, **4.3** or **3.4**.

Implementation details + review criteria for `api-platform-resources`.

## Packages and supported versions

API Platform v2 shipped a monolith `api-platform/core`. **v3/v4 split it into components** — install only what you need:

```bash
composer require api                       # Flex alias → api-platform/symfony stack
composer require api-platform/symfony      # Symfony bridge (HTTP, routing, bundle)
composer require api-platform/doctrine-orm # Doctrine ORM state providers/processors
composer require api-platform/graphql      # GraphQL (optional)
composer require --dev api-platform/test   # ApiTestCase, 5.0 only (see api-platform-tests)
```

| API Platform | Symfony | PHP | Status |
|---|---|---|---|
| **5.0** | 7.4 LTS / 8.x | 8.2+ | stable, target |
| **4.4** | 7.4 LTS / 8.x | 8.2+ | 4 to 5 bridge: 5.0 features plus deprecated APIs |
| **4.3** | 6.4 LTS / 7.x / 8.x | 8.2+ | last release supporting Symfony 6.4 LTS |
| **3.4** | 6.4 / 7.1+ | 8.1+ | unmaintained, legacy |

From 4.4, `api-platform/doctrine-orm` requires `doctrine/orm` `^2.17 || ^3.3`.
To stay on Symfony 6.4 LTS, pin `api-platform/*` to `~4.3.0`. Every version
uses the same component split.

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

## New in 4.4 and 5.0

- **`Query` operation (4.4+)**: `ApiPlatform\Metadata\Query` is a collection
  operation for the HTTP `QUERY` method, reading its criteria from a JSON or
  form body instead of the URL. Useful for search payloads too large for a query
  string.
- **`throwOnNotFound` (4.4+)**: a `POST` or `PUT` with URI variables does not 404
  by default when the read returns nothing. Set `throwOnNotFound: true` on
  action endpoints such as `POST /books/{id}/discount` so a missing resource
  returns 404 instead of reaching your processor.
- **`routePriority` (5.0)**: controls the order in which operation routes are
  matched, for overlapping `uriTemplate` values.
- **`%param%` in resource config (5.0)**: container parameters resolve in
  attributes, YAML and XML resource configuration.
- **OpenAPI 3.2 (4.4+)** output, and the Scalar API Reference as an alternative
  documentation UI.

None of these exist on **4.3**; check the installed version before using them.

## Validation commands
- php bin/console debug:router
- php bin/console api:openapi:export --yaml
- ./vendor/bin/phpunit --filter=Api
