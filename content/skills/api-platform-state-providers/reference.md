# API Platform State Providers & Processors Reference (Symfony)

Targets **API Platform v4** (current 4.3). v3.4 deltas flagged inline. The provider/processor architecture replaced v2's DataProvider/DataPersister in v3.0.

## ProviderInterface (reads)

Namespace `ApiPlatform\State`. **v4** narrowed the return type to `iterable|object|null`; **v3.4** declared it as `mixed` (code returning iterable/object/null is forward-compatible).

```php
<?php
// src/State/BookProvider.php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

/**
 * @implements ProviderInterface<Book>
 */
final class BookProvider implements ProviderInterface
{
    public function provide(
        Operation $operation,
        array $uriVariables = [],
        array $context = []
    ): iterable|object|null {        // v4 signature — v3.4 returns `mixed`
        if ($operation instanceof CollectionOperationInterface) {
            return $this->repository->findAllActive();
        }

        return $this->repository->find($uriVariables['id']); // null → 404
    }
}
```

Wire it on the resource:

```php
#[ApiResource(provider: BookProvider::class)]
#[Get(provider: BookProvider::class)]
```

Autowiring auto-registers providers. Without autowiring, tag with `api_platform.state_provider`.

## Decorating the built-in Doctrine provider

Wrap the default provider (composition) to keep Doctrine fetching but post-process the result — e.g. return a DTO or enforce a tenant scope:

```php
<?php
// src/State/BookProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class BookProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private ProviderInterface $collectionProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private ProviderInterface $itemProvider,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable|object|null
    {
        $provider = $operation instanceof \ApiPlatform\Metadata\CollectionOperationInterface
            ? $this->collectionProvider
            : $this->itemProvider;

        $data = $provider->provide($operation, $uriVariables, $context);

        // business logic / transformation here
        return $data;
    }
}
```

Built-in service IDs:
- ORM item provider: `api_platform.doctrine.orm.state.item_provider`
- ORM collection provider: `api_platform.doctrine.orm.state.collection_provider`

## ProcessorInterface (writes)

Namespace `ApiPlatform\State`. Signature unchanged since v3:

```php
<?php
// src/State/BookProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class BookProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
    ) {}

    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = []
    ): mixed {
        // pre-persist business logic (hashing, slug, audit…)
        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        // post-persist side effects (dispatch message, send mail…)
        return $result;
    }
}
```

Returns the created/modified object, or void for DELETE.

Built-in processor service IDs (Symfony / Doctrine ORM):
- `api_platform.doctrine.orm.state.persist_processor`
- `api_platform.doctrine.orm.state.remove_processor`

Wire on operations:

```php
#[Post(processor: BookProcessor::class)]
#[Delete(processor: 'api_platform.doctrine.orm.state.remove_processor')]
```

Without autowiring, tag with `api_platform.state_processor`.

## NEW in v4 — `write: true` on read operations (CQRS)

v4 lets a processor run on **safe** HTTP methods (GET / GetCollection), so a "read" endpoint can dispatch a query/command handler:

```php
#[GetCollection(processor: CarReportProcessor::class, write: true)]
class Car {}
```

```yaml
# YAML equivalent
resources:
    App\Entity\Car:
        operations:
            ApiPlatform\Metadata\GetCollection:
                processor: App\State\CarReportProcessor
                write: true
```

This is the notable v4 capability — in v3.4 processors only ran on write methods.

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
