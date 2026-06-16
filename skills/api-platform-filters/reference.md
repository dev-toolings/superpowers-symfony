# Reference

# API Platform Filters

> **Version note.** API Platform **v4** introduces the **Parameters API** (`QueryParameter` / `HeaderParameter` + new filter classes) and **no longer recommends** the `#[ApiFilter]` attribute. The `#[ApiFilter(SearchFilter::class, properties:)]` style below is **still supported** but is now the **v3/legacy** approach. See "API Platform v4 — Parameters API" further down for the recommended v4 path.

## API Platform v4 — Parameters API (recommended)

> "For maximum flexibility and to ensure future compatibility, it is strongly recommended to configure your filters via the `parameters` attribute using `QueryParameter`. The legacy method using the `ApiFilter` attribute is not recommended."

### Declaration via `parameters`

`QueryParameter` / `HeaderParameter` live in `ApiPlatform\Metadata`. Filter classes are decorators composed together:

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\QueryParameter;
use ApiPlatform\Doctrine\Orm\Filter\ComparisonFilter;
use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\PartialSearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\SortFilter;
use ApiPlatform\Doctrine\Orm\Filter\FreeTextQueryFilter;

#[ApiResource]
#[GetCollection(
    parameters: [
        // exact match: ?sku=ABC123
        'sku' => new QueryParameter(filter: new ExactFilter(), property: 'sku'),

        // gt/gte/lt/lte/ne wrapper: ?price[gte]=1000
        'price' => new QueryParameter(filter: new ComparisonFilter(new ExactFilter()), property: 'price'),

        // partial LIKE search: ?name=phone
        'name' => new QueryParameter(filter: new PartialSearchFilter(), property: 'name'),

        // sorting: ?sort[name]=asc
        'sort' => new QueryParameter(filter: new SortFilter()),

        // search across several properties via one param: ?q=apple
        'q' => new QueryParameter(filter: new FreeTextQueryFilter(new PartialSearchFilter()), properties: ['name', 'description']),
    ],
)]
class Product
{
    // ...
}
```

### Modern v4 filter classes

| Class | Role |
|---|---|
| `ExactFilter` | exact equality (`=`) |
| `PartialSearchFilter` | `LIKE %value%` |
| `ComparisonFilter` | decorator adding `gt`, `gte`, `lt`, `lte`, `ne` |
| `SortFilter` | sorting (replaces `OrderFilter`) |
| `FreeTextQueryFilter` | multi-property filtering through a single parameter |
| `OrFilter` | decorator forcing OR logic instead of AND |
| `IriFilter` | filter on an IRI / related resource |

Use `:property` placeholders in parameter keys for dynamic multi-property filtering.

### `strictQueryParameterValidation` (NEW v4)

Reject unknown query parameters with **400 Bad Request** instead of silently ignoring them:

```php
#[GetCollection(strictQueryParameterValidation: true)]
```

```yaml
# config/packages/api_platform.yaml — global
api_platform:
    defaults:
        strict_query_parameter_validation: true
```

### Custom filter v4 — read params from `$context['parameter']`

v4 filters avoid constructor injection of per-request state. Implement `ApiPlatform\Doctrine\Orm\Filter\FilterInterface` and read the bound parameter (value + property) from the context:

```php
<?php
// src/Filter/ActiveFilter.php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\FilterInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class ActiveFilter implements FilterInterface
{
    public function apply(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // v4: the bound parameter (its request value + target property) comes from context
        $parameter = $context['parameter'] ?? null;
        if ($parameter === null || filter_var($parameter->getValue(), FILTER_VALIDATE_BOOLEAN) === false) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $queryBuilder->andWhere(sprintf('%s.deletedAt IS NULL', $alias));
    }

    public function getDescription(string $resourceClass): array
    {
        return [];
    }
}
```

```php
#[GetCollection(parameters: ['active' => new QueryParameter(filter: ActiveFilter::class)])]
class Product {}
```

### v4 architecture note

Metadata is separated from runtime: property expansion + OpenAPI documentation happen at **boot time** (cached), not per request. Filter classes therefore stay stateless and pull request data from `$context`.

---

## Legacy `#[ApiFilter]` (v3 / still supported in v4)

The patterns below use the `#[ApiFilter]` attribute — the **v3.4-recommended** style. They keep working in v4 but the Parameters API above is preferred for new code.

## Built-in Filters

### Search Filter

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;

#[ApiResource]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial',        // LIKE %value%
    'description' => 'partial',
    'sku' => 'exact',           // = value
    'category.name' => 'exact', // Related entity
])]
class Product
{
    // ...
}
```

Search strategies:
- `exact`: Exact match (`=`)
- `partial`: Contains (`LIKE %value%`)
- `start`: Starts with (`LIKE value%`)
- `end`: Ends with (`LIKE %value`)
- `word_start`: Word starts with

Usage:
```http
GET /api/products?name=phone
GET /api/products?category.name=electronics
```

### Date Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;

#[ApiFilter(DateFilter::class, properties: ['createdAt', 'updatedAt'])]
class Product
{
    #[ORM\Column]
    private \DateTimeImmutable $createdAt;
}
```

Usage:
```http
GET /api/products?createdAt[after]=2024-01-01
GET /api/products?createdAt[before]=2024-12-31
GET /api/products?createdAt[strictly_after]=2024-01-01
GET /api/products?createdAt[strictly_before]=2024-12-31
```

### Range Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;

#[ApiFilter(RangeFilter::class, properties: ['price', 'stock'])]
class Product
{
    #[ORM\Column]
    private int $price;

    #[ORM\Column]
    private int $stock;
}
```

Usage:
```http
GET /api/products?price[gte]=1000&price[lte]=5000
GET /api/products?stock[gt]=0
```

Operators: `lt`, `lte`, `gt`, `gte`, `between`

### Boolean Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;

#[ApiFilter(BooleanFilter::class, properties: ['isActive', 'isFeatured'])]
class Product
{
    #[ORM\Column]
    private bool $isActive = true;
}
```

Usage:
```http
GET /api/products?isActive=true
GET /api/products?isFeatured=1
```

### Order Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;

#[ApiFilter(OrderFilter::class, properties: [
    'name' => 'ASC',
    'price',
    'createdAt',
])]
class Product
{
    // ...
}
```

Usage:
```http
GET /api/products?order[price]=desc
GET /api/products?order[createdAt]=asc&order[name]=asc
```

### Exists Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;

#[ApiFilter(ExistsFilter::class, properties: ['deletedAt', 'description'])]
class Product
{
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;
}
```

Usage:
```http
GET /api/products?exists[deletedAt]=false  # Not deleted
GET /api/products?exists[description]=true  # Has description
```

## Custom Filters

### Simple Custom Filter

```php
<?php
// src/Filter/ActiveProductFilter.php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class ActiveProductFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'active') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $paramName = $queryNameGenerator->generateParameterName('active');

        $queryBuilder
            ->andWhere(sprintf('%s.isActive = :%s', $alias, $paramName))
            ->andWhere(sprintf('%s.deletedAt IS NULL', $alias))
            ->setParameter($paramName, filter_var($value, FILTER_VALIDATE_BOOLEAN));
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'active' => [
                'property' => 'active',
                'type' => 'bool',
                'required' => false,
                'description' => 'Filter active products (not deleted)',
                'openapi' => [
                    'example' => 'true',
                ],
            ],
        ];
    }
}
```

Usage:

```php
#[ApiResource]
#[ApiFilter(ActiveProductFilter::class)]
class Product { /* ... */ }
```

### Filter with Multiple Properties

```php
<?php
// src/Filter/PriceRangeFilter.php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class PriceRangeFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'priceRange') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];

        $ranges = [
            'budget' => [0, 5000],
            'mid' => [5000, 20000],
            'premium' => [20000, 50000],
            'luxury' => [50000, null],
        ];

        if (!isset($ranges[$value])) {
            return;
        }

        [$min, $max] = $ranges[$value];

        $minParam = $queryNameGenerator->generateParameterName('minPrice');
        $queryBuilder
            ->andWhere(sprintf('%s.price >= :%s', $alias, $minParam))
            ->setParameter($minParam, $min);

        if ($max !== null) {
            $maxParam = $queryNameGenerator->generateParameterName('maxPrice');
            $queryBuilder
                ->andWhere(sprintf('%s.price < :%s', $alias, $maxParam))
                ->setParameter($maxParam, $max);
        }
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'priceRange' => [
                'property' => 'priceRange',
                'type' => 'string',
                'required' => false,
                'description' => 'Filter by price range',
                'openapi' => [
                    'enum' => ['budget', 'mid', 'premium', 'luxury'],
                ],
            ],
        ];
    }
}
```

## Filter Groups

Apply multiple filters per operation:

```php
#[ApiResource(
    operations: [
        new GetCollection(
            filters: [
                SearchFilter::class,
                OrderFilter::class,
                ActiveProductFilter::class,
            ]
        ),
    ]
)]
class Product { /* ... */ }
```

## Database Indexing

Always index filtered columns:

```php
#[ORM\Entity]
#[ORM\Index(columns: ['name'], name: 'idx_product_name')]
#[ORM\Index(columns: ['price'], name: 'idx_product_price')]
#[ORM\Index(columns: ['created_at'], name: 'idx_product_created')]
#[ORM\Index(columns: ['is_active', 'deleted_at'], name: 'idx_product_active')]
class Product
{
    // ...
}
```

## Best Practices

1. **Index filtered columns** for performance
2. **Limit searchable properties** - don't expose everything
3. **Use exact for IDs** and foreign keys
4. **Use partial sparingly** - it prevents index usage
5. **Document filters** with OpenAPI descriptions
6. **Validate filter values** in custom filters


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

