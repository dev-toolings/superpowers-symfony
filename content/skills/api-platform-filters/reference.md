# Reference

# API Platform Filters

> **Versions.** Written for **API Platform 5.0** (Symfony 7.4 LTS / 8.x). It also
> runs on **4.4**, the 4 to 5 bridge release (same features, plus the APIs that
> 5.0 removed), except where flagged. **4.3** is the last release supporting
> **Symfony 6.4 LTS**; **3.4** is unmaintained (legacy). Deltas are flagged
> inline as **5.0**, **4.4+**, **4.3** or **3.4**.

> **Filter versions.** The **Parameters API** (`QueryParameter` /
> `HeaderParameter` + filter classes) is the only recommended path. Since
> **4.4**, the `#[ApiFilter]` attribute, the legacy `SearchFilter`,
> `BooleanFilter`, `NumericFilter`, `BackedEnumFilter` and `OrderFilter`, and
> the `AbstractFilter` base class are **deprecated** (removed in 6.0): they
> still work in 4.4 and 5.0. `php bin/console api:upgrade-filter` (**4.4+**)
> rewrites `#[ApiFilter]` declarations to `QueryParameter`. On **4.3**
> (Symfony 6.4 LTS), use the Parameters API with the 4.3 classes listed below;
> the legacy section stays for 4.3 and 3.4 codebases.

## Parameters API (recommended, v4+)

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

### Modern filter classes

| Class | Role | Since |
|---|---|---|
| `ExactFilter` | exact equality (`=`); also booleans, numbers, backed enums | 4.2 |
| `PartialSearchFilter` | `LIKE %value%` | 4.2 |
| `StartSearchFilter` / `EndSearchFilter` | `LIKE value%` / `LIKE %value` | 4.4 |
| `WordStartSearchFilter` | matches the start of any word | 4.4 |
| `ComparisonFilter` | decorator adding `gt`, `gte`, `lt`, `lte`, `ne`; `[between]=X..Y` in **5.0** | 4.3 |
| `SortFilter` | sorting (replaces `OrderFilter`) | 4.3 |
| `FreeTextQueryFilter` | multi-property filtering through a single parameter | 4.2 |
| `OrFilter` | decorator forcing OR logic instead of AND | 4.2 |
| `IriFilter` | filter on an IRI / related resource | 4.2 |
| `ChainFilter` | compose several filters on one parameter | 4.4 |

`DateFilter` and `ExistsFilter` are not deprecated: in **5.0** they no longer
extend `AbstractFilter` (same class names, same URL syntax).

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

## Legacy `#[ApiFilter]` (deprecated since 4.4, removed in 6.0)

The patterns below use the `#[ApiFilter]` attribute, the style recommended up
to 3.4. They still work in 4.4 and 5.0 (with deprecations). On **4.3** they
are only needed for what its filter set lacks (`start` / `end` search); on
**3.4** they are the only option. Migrate with this table (URL
syntax is unchanged), or let `api:upgrade-filter` (4.4+) rewrite them:

| Legacy | Replacement |
|---|---|
| `SearchFilter` `exact` / `partial` | `ExactFilter` / `PartialSearchFilter` |
| `SearchFilter` `start` / `end` | `StartSearchFilter` / `EndSearchFilter` (4.4+) |
| `SearchFilter` on a relation (IRI) | `IriFilter` |
| `BooleanFilter`, `NumericFilter`, `BackedEnumFilter` | `ExactFilter` (typed by the property) |
| `OrderFilter` | `SortFilter` |
| `RangeFilter` | `ComparisonFilter` with `[between]` (5.0; keep `RangeFilter` on 4.4 and 4.3) |
| `DateFilter`, `ExistsFilter` | unchanged, not deprecated |

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

> Deprecated in **5.0** in favor of `ComparisonFilter`, which gained
> `[between]=X..Y` in 5.0. On 4.4 and 4.3, `RangeFilter` is still the way to
> express `between`.

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

> These examples extend `AbstractFilter`, **deprecated since 4.4** (removed in
> 6.0). For new code on 4.3+, implement `FilterInterface` and read the value
> from `$context['parameter']`, as in "Custom filter v4" above. Keep the
> `AbstractFilter` form for 4.3 and 3.4 codebases.

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

## Validation commands
- ./vendor/bin/phpunit --filter=Filter
- php bin/console api:openapi:export
- php bin/console debug:router
