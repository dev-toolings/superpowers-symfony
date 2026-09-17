# Reference

# Doctrine Events (Symfony)

> **ORM 3 breaking change**: Doctrine `EventSubscriberInterface` subscribers were
> **removed in ORM 3.0**. The replacement is attribute-based listeners
> (`#[AsDoctrineListener]`, `#[AsEntityListener]`), available since
> **DoctrineBundle 2.8+**. Each event also gets its own typed argument class
> (`PostPersistEventArgs`, `PreUpdateEventArgs`, …) instead of the single
> `LifecycleEventArgs` from ORM 2.x.

## Three mechanisms — which to pick

| Mechanism | Scope | Container services? | Cost | Use when |
|-----------|-------|---------------------|------|----------|
| **Lifecycle callbacks** | one entity, its own method | no | fastest | self-contained logic (timestamps, slug from own fields) |
| **Entity listeners** | one entity class | yes (autowired) | medium | one entity needs a service (mailer, indexer) |
| **Lifecycle listeners** | every entity | yes | slowest (called for all) | cross-cutting concerns (audit log, global timestamps) |

Rule of thumb: start with a **callback**; reach for an **entity listener** when
you need a service; use a **global lifecycle listener** only for truly
cross-cutting behavior, and type-check the entity first.

## 1. Lifecycle callbacks

A method on the entity itself. Requires `#[ORM\HasLifecycleCallbacks]` on the
class.

```php
<?php
// src/Entity/Product.php

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
class Product
{
    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
```

Available callback attributes: `#[ORM\PrePersist]`, `#[ORM\PostPersist]`,
`#[ORM\PreUpdate]`, `#[ORM\PostUpdate]`, `#[ORM\PreRemove]`,
`#[ORM\PostRemove]`, `#[ORM\PostLoad]`.

Callbacks cannot receive constructor-injected services — keep them to logic that
only touches the entity's own state.

## 2. Entity listeners (one entity, with services)

A separate class bound to one entity. It is a regular autowired service.

```php
<?php
// src/EntityListener/UserChangedNotifier.php

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Events;

#[AsEntityListener(event: Events::postUpdate, method: 'postUpdate', entity: User::class)]
final class UserChangedNotifier
{
    public function __construct(
        private NotifierInterface $notifier,
    ) {}

    public function postUpdate(User $user, PostUpdateEventArgs $event): void
    {
        // Fires only for User entities — no type-check needed.
        $this->notifier->notifyAccountChange($user);
    }
}
```

The handler signature is `(EntityType $entity, <Event>EventArgs $event)`. You
can attach several `#[AsEntityListener]` attributes to one class for different
events.

YAML equivalent (tag) if not using the attribute:

```yaml
services:
    App\EntityListener\UserChangedNotifier:
        tags:
            - { name: doctrine.orm.entity_listener, event: postUpdate, entity: App\Entity\User }
```

## 3. Lifecycle listeners (all entities, with services)

A global listener invoked for **every** entity on the given event. Always
type-check.

```php
<?php
// src/EventListener/SearchIndexer.php

use App\Entity\Product;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Events;

#[AsDoctrineListener(event: Events::postPersist, priority: 500, connection: 'default')]
final class SearchIndexer
{
    public function __construct(
        private SearchClient $search,
    ) {}

    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();

        if (!$entity instanceof Product) {
            return; // ignore everything that is not a Product
        }

        $em = $args->getObjectManager();
        $this->search->index($entity);
    }
}
```

`priority` defaults to `0`; higher runs earlier. `connection` scopes the
listener to one connection.

YAML equivalent:

```yaml
services:
    App\EventListener\SearchIndexer:
        tags:
            - { name: doctrine.event_listener, event: postPersist, priority: 500, connection: default }
```

## Per-event argument classes (ORM 3)

The single `LifecycleEventArgs` of ORM 2 is replaced by one class per event,
all in `Doctrine\ORM\Event`:

| Event (`Events::*`) | Argument class | Notes |
|---------------------|----------------|-------|
| `prePersist` | `PrePersistEventArgs` | before INSERT |
| `postPersist` | `PostPersistEventArgs` | ID is available now |
| `preUpdate` | `PreUpdateEventArgs` | change set only; see below |
| `postUpdate` | `PostUpdateEventArgs` | after UPDATE |
| `preRemove` | `PreRemoveEventArgs` | before DELETE |
| `postRemove` | `PostRemoveEventArgs` | after DELETE |
| `postLoad` | `PostLoadEventArgs` | after hydration |
| `onFlush` | `OnFlushEventArgs` | whole unit of work |

Common accessors: `$args->getObject()` (the entity),
`$args->getObjectManager()` (the `EntityManagerInterface`).

### preUpdate is special

`preUpdate` runs on a computed change set. You may only change already-changed
fields, through the event API — never modify associations or call other
entities' setters here, and never `flush()`:

```php
use Doctrine\ORM\Event\PreUpdateEventArgs;

public function preUpdate(PreUpdateEventArgs $args): void
{
    if ($args->hasChangedField('price')) {
        $old = $args->getOldValue('price');
        $new = $args->getNewValue('price');
        // adjust the value being written:
        $args->setNewValue('price', max(0, $new));
    }
}
```

## Migrating from an ORM 2 EventSubscriber

```php
// BEFORE (ORM 2 — removed in ORM 3):
class MySubscriber implements \Doctrine\Common\EventSubscriber
{
    public function getSubscribedEvents(): array
    {
        return [Events::postPersist];
    }

    public function postPersist(LifecycleEventArgs $args): void { /* ... */ }
}
```

```php
// AFTER (ORM 3):
#[AsDoctrineListener(event: Events::postPersist)]
final class MyListener
{
    public function postPersist(PostPersistEventArgs $args): void { /* ... */ }
}
```

Steps: drop `implements EventSubscriber` and `getSubscribedEvents()`; add
`#[AsDoctrineListener(event: Events::...)]` (one attribute per event); swap
`LifecycleEventArgs` for the per-event typed class.

## Guardrails

1. **No subscribers on ORM 3** — they no longer exist; use the attributes.
2. **Don't `flush()` in a handler** — it re-enters the unit of work mid-flight.
3. **Type-check in global listeners** — they fire for every entity.
4. **`preUpdate` = change set only** — use `setNewValue()`, leave associations alone.
5. **Prefer the narrowest scope** — callback < entity listener < lifecycle listener.

## Applicability

- **ORM 3.x + DoctrineBundle 2.8+** (target): attributes + per-event args, no
  subscribers.
- **ORM 2.x (legacy)**: subscribers and the single `LifecycleEventArgs` still
  work but are deprecated — migrate before upgrading to 3.0.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console doctrine:migrations:diff
- php bin/console doctrine:migrations:migrate
- ./vendor/bin/phpunit --filter=Doctrine

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.
