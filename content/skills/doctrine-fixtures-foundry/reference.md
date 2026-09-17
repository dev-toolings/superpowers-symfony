# Reference

# Doctrine Fixtures with Foundry v2

Foundry provides modern, type-safe factories for creating test data and fixtures.

> **Version applicability** — This reference targets **Zenstruck Foundry v2** (current). v2 is a major rewrite of v1:
> - Factories extend `PersistentObjectFactory` (was `Factory` / `ModelFactory` with `getEntityClass()` + `getDefaults()`).
> - Factories are **immutable**: state methods return **new** instances.
> - Factories return **real entity objects**, not `Proxy` wrappers.
>
> See "v1 → v2 migration" at the bottom if you encounter legacy code.

## Installation

```bash
composer require zenstruck/foundry --dev
# make:factory / make:story commands need MakerBundle:
composer require symfony/maker-bundle --dev
# optional, for non-Foundry fixture loading:
composer require doctrine/doctrine-fixtures-bundle --dev
```

## Creating Factories (v2)

```bash
# Generate a factory for an entity
bin/console make:factory Post
```

```php
<?php
// src/Factory/PostFactory.php

namespace App\Factory;

use App\Entity\Post;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<Post>
 */
final class PostFactory extends PersistentObjectFactory
{
    // v2: static class() replaces v1 getEntityClass()
    public static function class(): string
    {
        return Post::class;
    }

    // v2: defaults() replaces v1 getDefaults(); may return array OR callable
    protected function defaults(): array|callable
    {
        return [
            'title' => self::faker()->text(255),
            'content' => self::faker()->paragraphs(3, true),
            'createdAt' => \DateTimeImmutable::createFromMutable(
                self::faker()->dateTime()
            ),
        ];
    }

    // Optional global init hook (runs for every instance)
    protected function initialize(): static
    {
        return $this->afterInstantiate(function (Post $post): void {
            // mutate the instance before persist if needed
        });
    }

    // Named states — IMMUTABLE: return a NEW instance via with()
    public function published(): self
    {
        return $this->with(['publishedAt' => self::faker()->dateTime()]);
    }
}
```

## Creation API

Factories return **real entity objects** (no Proxy in v2).

```php
use App\Factory\PostFactory;

// Single entity
$post = PostFactory::createOne(['title' => 'Hello']);   // returns Post

// Multiple
$posts = PostFactory::createMany(5);                     // Post[]
$posts = PostFactory::createMany(5, ['title' => 'X']);
$posts = PostFactory::createMany(5, fn(int $i) => ['title' => "Title $i"]);

// Find or create
$post = PostFactory::findOrCreate(['title' => 'Unique']);

// Build without persisting via new()
$post = PostFactory::new()->withoutPersisting()->create();
```

### Fluent / states (immutable)

Each method returns a NEW factory instance — chain freely.

```php
// with() overrides attributes
$post = PostFactory::new()->with(['title' => 'A'])->create();

// state methods compose
$post = PostFactory::new()->published()->create();

// many() + create()
$posts = PostFactory::new()->published()->many(3)->create();
```

## Query API

```php
PostFactory::first();              // PostFactory::first('createdAt')
PostFactory::last();
PostFactory::count();
PostFactory::all();
PostFactory::find(5);              // by id; or find(['title' => 'X'])
PostFactory::findBy(['published' => true]);
PostFactory::random();
PostFactory::randomOrCreate(['title' => 'X']);
PostFactory::randomSet(4);
PostFactory::randomRange(0, 5);
```

## Relationships

```php
// ManyToOne — reference the related object
CommentFactory::createOne(['post' => PostFactory::random()]);

// OneToMany — pass a factory with many()
PostFactory::createOne(['comments' => CommentFactory::new()->many(6)]);

// ManyToMany — random set
PostFactory::createOne(['tags' => TagFactory::randomSet(2)]);

// Auto-create the related entity by default
protected function defaults(): array
{
    return [
        'title'  => self::faker()->sentence(),
        'author' => UserFactory::new(),   // creates a User automatically
    ];
}
```

## Sequences & distribution (v2.4+)

```php
PostFactory::createSequence([
    ['title' => 'First'],
    ['title' => 'Second'],
]);

PostFactory::new()
    ->sequence([['title' => '1'], ['title' => '2']])
    ->distribute('category', $categories)   // spread a value across instances
    ->create();

PostFactory::new()->many(3)->applyStateMethod('published')->create();
```

## Hooks

Inline hooks (per factory):

```php
protected function initialize(): static
{
    return $this
        ->beforeInstantiate(fn(array $attrs) => $attrs)
        ->afterInstantiate(function (Post $post): void { /* ... */ })
        // afterPersist listeners must manually flush() if they create entities
        ->afterPersist(function (Post $post): void {
            CommentFactory::createMany(3, ['post' => $post]);
        });
}
```

Global hooks via attribute (**v2.8+**) — place on a method receiving the event:

```php
use Zenstruck\Foundry\Attribute\AsFoundryHook;
use Zenstruck\Foundry\Persistence\Hook\AfterPersist;

final class GlobalHooks
{
    #[AsFoundryHook(Post::class)]   // or #[AsFoundryHook] for all entities
    public function afterPersist(AfterPersist $event): void
    {
        // ...
    }
}
```

## Instantiation control

```php
use Zenstruck\Foundry\Object\Instantiator;

PostFactory::new()->instantiateWith(
    Instantiator::withConstructor()->allowExtra('legacyField')
);
// Instantiator::withoutConstructor(), ->alwaysForce(...), ->namedConstructor(...)
// force($value) helper to force-set a single attribute
```

## Persistence control

```php
$post = PostFactory::new()->withoutPersisting()->create();
PostFactory::new()->withoutDoctrineEvents()->create();
```

```yaml
# config/packages/zenstruck_foundry.yaml
when@dev: &dev
    zenstruck_foundry:
        # v2.5+: NOT enabling flush_once is DEPRECATED — set it true
        persistence:
            flush_once: true
when@test: *dev
```

Standalone helpers (`use function Zenstruck\Foundry\Persistence\*;`):

```php
object(Post::class, ['title' => 'X']);
save($object);
persistent_factory(Post::class);
repository(Post::class);
assert_persisted($object);
assert_not_persisted($object);
```

## Stories

```php
<?php
// src/Story/PostStory.php

namespace App\Story;

use App\Factory\PostFactory;
use Zenstruck\Foundry\Attribute\AsFixture;
use Zenstruck\Foundry\Story;

#[AsFixture(name: 'posts', groups: ['all'])]   // v2.6+
final class PostStory extends Story
{
    public function build(): void
    {
        $this->addState('first', PostFactory::createOne(['title' => 'First']));
    }
}
```

```php
PostStory::load();                  // idempotent
$post = PostStory::get('first');    // retrieve a named state
```

Load fixture-tagged stories/factories (**v2.6+**):

```bash
bin/console foundry:load-fixtures
bin/console foundry:load-fixtures --group=all
```

Non-Foundry DataFixtures still work; use the `#[AsFixture]` + `foundry:load-fixtures`
path when you want Foundry to own fixture loading.

## Testing integration

### PHPUnit 10+ / Foundry v2.9+ (recommended)

Register the extension in `phpunit.dist.xml`:

```xml
<extensions>
    <bootstrap class="Zenstruck\Foundry\PHPUnit\FoundryExtension"/>
</extensions>
```

Use the `#[ResetDatabase]` attribute on test classes that touch the DB:

```php
<?php
// tests/PostFactoryTest.php

namespace App\Tests;

use App\Factory\PostFactory;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Foundry\Attribute\ResetDatabase;

#[ResetDatabase]
final class PostFactoryTest extends KernelTestCase
{
    public function testCreatesPost(): void
    {
        $post = PostFactory::createOne(['title' => 'Hello']);

        self::assertSame('Hello', $post->getTitle());   // real object, no ->object()
        PostFactory::assert()->count(1);
    }
}
```

### PHPUnit 9 (legacy)

Use traits instead of the extension/attribute:

```php
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

final class PostFactoryTest extends KernelTestCase
{
    use Factories;
    use ResetDatabase;   // resets the DB before each test
}
```

### Reset configuration

```yaml
# config/packages/zenstruck_foundry.yaml
zenstruck_foundry:
    orm:
        reset:
            mode: schema   # or 'migrate' to run migrations instead of drop/create
```

With **DAMADoctrineTestBundle**, the global state is loaded once per suite (inside a
transaction rolled back per test) instead of being reset per test — much faster.

## Assertions

```php
assert_persisted($object);
PostFactory::assert()->count(3);
PostFactory::assert()->exists(['title' => 'Hello']);
PostFactory::assert()->empty();
```

## Faker

```php
use function Zenstruck\Foundry\faker;

$email = faker()->email();
// in a factory: self::faker()->email()
```

```yaml
zenstruck_foundry:
    faker:
        locale: fr_FR
# Deterministic data: FOUNDRY_FAKER_SEED=1234
```

## Best practices

1. **Minimal defaults** — only set required/unique fields; use `self::faker()->unique()` for uniques.
2. **Named states** — express variations (`admin()`, `published()`) as immutable state methods.
3. **Let factories build relations** — default related entities via `XFactory::new()`.
4. **Real objects** — in v2 you call entity methods directly; no `->object()` / `->_real()`.
5. **Don't over-factory** — trivial data can be created inline.

```php
// Good: minimal, realistic, unique
protected function defaults(): array
{
    return [
        'email' => self::faker()->unique()->safeEmail(),
        'roles' => ['ROLE_USER'],
    ];
}
```

## v1 → v2 migration (legacy code you may encounter)

| v1 | v2 |
| --- | --- |
| `extends ModelFactory` / `Factory` | `extends PersistentObjectFactory` |
| `protected static function getClass(): string` | `public static function class(): string` |
| `protected function getDefaults(): array` | `protected function defaults(): array\|callable` |
| Mutating `$this` in states | Immutable: state methods return a new instance |
| Returns `Proxy<T>`, call `->object()` | Returns real `T`, call methods directly |
| `$proxy->object()` | the object itself |

### Deprecations (v2.7+)

- The **object Proxy mechanism is deprecated** → use auto-refresh
  (requires **PHP 8.4** + `persistence.enable_auto_refresh_with_lazy_objects: true`).
- `PersistentProxyObjectFactory` is **deprecated** → use `PersistentObjectFactory`.
  Proxy helpers (`_real()`, `_save()`, `_refresh()`, `_set()`, `_get()`,
  `_enableAutoRefresh()`) still work but are deprecated.
- Not enabling `flush_once` is **deprecated** (v2.5+).


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
