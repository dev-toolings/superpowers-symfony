# API Platform Overview

API Platform is a powerful full-stack framework for building API-driven projects. It's the preferred choice for creating REST and GraphQL APIs in Symfony.

## Installation

```bash
composer require api-platform/core
```

## Basic Resource Configuration

### Entity-based Resource

```php
<?php
// src/Entity/Product.php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    paginationItemsPerPage: 20,
    order: ['createdAt' => 'DESC'],
)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    #[Assert\Positive]
    private int $priceInCents;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // Getters and setters...
}
```

## Operations

### Standard CRUD

| Operation | HTTP Method | URL | Description |
|-----------|-------------|-----|-------------|
| GetCollection | GET | /products | List all products |
| Get | GET | /products/{id} | Get single product |
| Post | POST | /products | Create product |
| Put | PUT | /products/{id} | Replace product |
| Patch | PATCH | /products/{id} | Update product |
| Delete | DELETE | /products/{id} | Delete product |

### Custom Operations

```php
#[ApiResource(
    operations: [
        // Standard operations...
        new Post(
            uriTemplate: '/products/{id}/publish',
            controller: PublishProductController::class,
            name: 'publish_product',
            read: false,
            openapiContext: [
                'summary' => 'Publish a product',
                'requestBody' => [
                    'content' => [
                        'application/json' => [
                            'schema' => [],
                        ],
                    ],
                ],
            ],
        ),
    ],
)]
```

## Pagination

### Configuration Options

```php
#[ApiResource(
    paginationEnabled: true,              // Enable pagination
    paginationItemsPerPage: 20,           // Default items per page
    paginationMaximumItemsPerPage: 100,   // Maximum allowed
    paginationClientEnabled: true,        // Allow client to enable/disable
    paginationClientItemsPerPage: true,   // Allow client to change page size
)]
```

### Client Usage

```http
GET /api/products?page=2
GET /api/products?itemsPerPage=50
GET /api/products?pagination=false
```

### Cursor Pagination

```php
#[ApiResource(
    paginationPartial: true,
    paginationViaCursor: [
        ['field' => 'createdAt', 'direction' => 'DESC'],
        ['field' => 'id', 'direction' => 'DESC'],
    ],
)]
```

## Security

### Operation-Level Security

```php
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Put(security: "is_granted('ROLE_ADMIN') or object.owner == user"),
        new Patch(security: "is_granted('ROLE_ADMIN') or object.owner == user"),
        new Delete(security: "is_granted('ROLE_ADMIN')"),
    ],
)]
```

### Security Post-Denormalize

Validate after data is set:

```php
new Put(
    security: "is_granted('ROLE_USER')",
    securityPostDenormalize: "object.owner == user",
    securityPostDenormalizeMessage: "You can only edit your own products",
)
```

## Validation

### Validation Groups

```php
#[ApiResource(
    operations: [
        new Post(validationContext: ['groups' => ['Default', 'create']]),
        new Put(validationContext: ['groups' => ['Default', 'update']]),
    ],
)]
class Product
{
    #[Assert\NotBlank(groups: ['create'])]
    private string $name;

    #[Assert\NotBlank(groups: ['update'])]
    private ?\DateTimeImmutable $updatedAt = null;
}
```

## Filters

See dedicated [Filters documentation](../../content/skills/api-platform-filters/SKILL.md).

```php
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;

#[ApiResource]
#[ApiFilter(SearchFilter::class, properties: ['name' => 'partial'])]
#[ApiFilter(DateFilter::class, properties: ['createdAt'])]
#[ApiFilter(RangeFilter::class, properties: ['priceInCents'])]
#[ApiFilter(OrderFilter::class, properties: ['name', 'createdAt', 'priceInCents'])]
class Product { /* ... */ }
```

## Serialization Groups

```php
use Symfony\Component\Serializer\Annotation\Groups;

#[ApiResource(
    normalizationContext: ['groups' => ['product:read']],
    denormalizationContext: ['groups' => ['product:write']],
)]
class Product
{
    #[Groups(['product:read'])]
    private ?int $id = null;

    #[Groups(['product:read', 'product:write'])]
    private string $name;

    #[Groups(['product:read'])]
    private \DateTimeImmutable $createdAt;
}
```

## OpenAPI Documentation

### Property Documentation

```php
use ApiPlatform\Metadata\ApiProperty;

class Product
{
    #[ApiProperty(
        description: 'The unique identifier',
        readable: true,
        writable: false,
        example: 123,
    )]
    private ?int $id = null;

    #[ApiProperty(
        description: 'Product name',
        example: 'Wireless Keyboard',
    )]
    private string $name;
}
```

### Operation Documentation

```php
new GetCollection(
    openapiContext: [
        'summary' => 'Retrieve the product collection',
        'description' => 'Returns a paginated list of all available products',
        'parameters' => [
            [
                'name' => 'category',
                'in' => 'query',
                'description' => 'Filter by category ID',
                'required' => false,
                'schema' => ['type' => 'integer'],
            ],
        ],
    ],
)
```

## Best Practices

1. **Use DTOs** for complex transformations (see [DTO Resources](dto-resources.md))
2. **State Providers** for custom data retrieval (see [State Providers](state-providers-processors.md))
3. **Validation** on input DTOs or entities
4. **Security** at operation level with voters
5. **Pagination** always enabled for collections
6. **Filters** with proper database indexes
7. **Serialization Groups** for different contexts

## Configuration

```yaml
# config/packages/api_platform.yaml
api_platform:
    title: 'My API'
    version: '1.0.0'
    formats:
        jsonld: ['application/ld+json']
        json: ['application/json']
    defaults:
        stateless: true
        cache_headers:
            max_age: 0
            shared_max_age: 3600
            vary: ['Content-Type', 'Authorization', 'Origin']
    swagger:
        versions: [3]
```

## Related Skills

- [API Platform Filters](../../content/skills/api-platform-filters/SKILL.md)
- [API Platform Serialization](../../content/skills/api-platform-serialization/SKILL.md)
- [API Platform Security](../../content/skills/api-platform-security/SKILL.md)
- [State Providers & Processors](state-providers-processors.md)
- [DTO Resources](dto-resources.md)
