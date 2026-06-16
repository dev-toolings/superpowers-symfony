# API Platform DTO Resources Reference (Symfony)

Targets **API Platform v4** (current 4.3). The biggest v3→v4 DTO change: **`DataTransformerInterface` is gone** (already removed by v3.4) and v4 introduces **Symfony Object Mapper** as the declarative mapping path.

## Core idea

The `#[ApiResource]` class IS the DTO — the API contract — decoupled from your Doctrine entity. You map between the two either declaratively (Object Mapper, v4) or manually (custom provider/processor, works in both v3.4 and v4).

## Strategy 1 (v4) — DTO resource + Object Mapper + stateOptions

Requires `symfony/object-mapper:^7.4|^8.0`. When the resource has `stateOptions` with an `entityClass` **and** both the DTO and entity carry `#[Map]`, API Platform decorates the Doctrine provider/processor with the Object Mapper variants automatically.

```php
<?php
// src/ApiResource/Book.php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiResource;
use App\Entity\BookEntity;
use Symfony\Component\ObjectMapper\Attribute\Map;

#[ApiResource(
    stateOptions: new Options(entityClass: BookEntity::class),
)]
#[Map(source: BookEntity::class)]   // Entity → this DTO
final class Book
{
    public ?int $id = null;

    #[Map(source: 'title')]          // BookEntity::$title → Book::$name
    public string $name;

    #[Map(transform: [self::class, 'formatPrice'])]
    public string $price;

    public static function formatPrice(int $cents): string
    {
        return number_format($cents / 100, 2) . ' €';
    }
}
```

Internal mapping classes engaged under the hood (no need to register them):
- `ApiPlatform\State\Provider\ObjectMapperProvider` (reads)
- `ApiPlatform\State\Processor\ObjectMapperProcessor` (writes)

`Options` is `ApiPlatform\Doctrine\Orm\State\Options`.

### `#[Map]` attribute (from `symfony/object-mapper`)

- `#[Map(source: 'field')]` — Entity → DTO direction
- `#[Map(target: 'field')]` — DTO → Entity direction
- `#[Map(transform: [Class::class, 'method'])]` — custom transform callback

## Strategy 2 (v4) — specialized input / output DTOs

Distinct shapes per operation, each `#[Map]`-bound to the entity:

```php
<?php

use Symfony\Component\ObjectMapper\Attribute\Map;

#[Map(target: BookEntity::class)]    // input → entity
final class CreateBook
{
    #[Map(target: 'title')]
    public string $name;
}

#[Map(source: BookEntity::class)]    // entity → output
final class BookCollectionItem
{
    #[Map(source: 'title')]
    public string $name;
}
```

```php
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;

#[ApiResource(operations: [
    new GetCollection(output: BookCollectionItem::class),
    new Post(input: CreateBook::class),
    new Patch(input: UpdateBook::class),
])]
final class Book {}
```

## Strategy 3 — custom processor business logic (v3.4 & v4)

When mapping needs real logic, do it explicitly in a processor (this is the *only* path in v3.4):

```php
<?php
// src/State/DiscountBookProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\Book;
use Symfony\Component\ObjectMapper\ObjectMapperInterface;

final readonly class DiscountBookProcessor implements ProcessorInterface
{
    public function __construct(private ObjectMapperInterface $objectMapper) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Book
    {
        $entity = $context['request']->attributes->get('read_data');
        $entity->price = (int) ($entity->price * (1 - $data->percentage / 100));

        return $this->objectMapper->map($entity, Book::class);
    }
}
```

```php
new Post(
    uriTemplate: '/books/{id}/discount',
    input: DiscountBook::class,
    processor: DiscountBookProcessor::class,
)
```

## v3.4 approach (for comparison / legacy code)

v3.4 has no Object Mapper. You declare `input` / `output` and map **manually** inside a custom `ProviderInterface` (read) and `ProcessorInterface` (write):

```php
// v3.4
#[Post(input: UserResetPasswordDto::class, processor: UserResetPasswordProcessor::class)]
final class User {}

#[Get(output: AnotherRepresentation::class, provider: BookRepresentationProvider::class)]
class Book {}
```

> `DataTransformerInterface` (`transform()` / `supportsTransformation()`) was the v2.x mechanism — **already removed by v3.4**. Do not reach for it; use providers/processors (v3.4) or Object Mapper (v4).

The manual provider/processor approach **still works in v4** — Object Mapper is the new *declarative* shortcut, not a forced replacement.

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
