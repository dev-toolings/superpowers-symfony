# Reference

# Doctrine Fetch Modes

## Fetch Mode Types

### LAZY (Default)

Relations loaded on first access - can cause N+1:

```php
#[ORM\ManyToOne(fetch: 'LAZY')]
private User $author;

// Usage
$post = $em->find(Post::class, 1);
$name = $post->getAuthor()->getName(); // Triggers query
```

### EAGER

Always load with parent - use sparingly:

```php
#[ORM\ManyToOne(fetch: 'EAGER')]
private User $author;

// Usage - author loaded in same query
$post = $em->find(Post::class, 1);
$name = $post->getAuthor()->getName(); // No extra query
```

### EXTRA_LAZY

For large collections - partial operations without full load:

```php
#[ORM\OneToMany(targetEntity: Comment::class, mappedBy: 'post', fetch: 'EXTRA_LAZY')]
private Collection $comments;

// These don't load the full collection:
$count = $post->getComments()->count();     // COUNT query
$has = $post->getComments()->contains($c);  // EXISTS query
$slice = $post->getComments()->slice(0, 5); // LIMIT query
```

## Query-Level Fetch Mode

> **ORM 3 note**: `Query::setFetchMode()` was removed. The portable, explicit
> way to eager-load a relation for a single query is a fetch join (`addSelect`
> + `leftJoin`, see below) rather than a per-query fetch-mode override.

```php
<?php

// In repository — fetch join is the ORM 3 replacement for per-query EAGER
public function findWithAuthor(int $id): ?Post
{
    return $this->createQueryBuilder('p')
        ->addSelect('a')
        ->leftJoin('p.author', 'a')
        ->where('p.id = :id')
        ->setParameter('id', $id)
        ->getQuery()
        ->getOneOrNullResult();
}
```

## Join Fetch (Best Practice)

Explicitly load relations in query:

```php
<?php
// src/Repository/PostRepository.php

public function findAllWithRelations(): array
{
    return $this->createQueryBuilder('p')
        ->addSelect('a', 't', 'c')  // Include in SELECT
        ->leftJoin('p.author', 'a')
        ->leftJoin('p.tags', 't')
        ->leftJoin('p.comments', 'c')
        ->orderBy('p.createdAt', 'DESC')
        ->getQuery()
        ->getResult();
}

public function findByIdWithAuthor(int $id): ?Post
{
    return $this->createQueryBuilder('p')
        ->addSelect('a')
        ->leftJoin('p.author', 'a')
        ->where('p.id = :id')
        ->setParameter('id', $id)
        ->getQuery()
        ->getOneOrNullResult();
}
```

## Loading Only the Columns You Need (DTO hydration)

> **ORM 3 breaking change**: the `partial` DQL keyword and
> `Query::HINT_FORCE_PARTIAL_LOAD` were deprecated in ORM 2.x and **removed in
> ORM 3.0**. `SELECT PARTIAL p.{id, title}` no longer parses. Use explicit DTO
> (`SELECT NEW`) hydration instead — it is faster, type-safe, and the partial
> object footguns (uninitialized fields, broken change tracking) are gone.

Define a plain DTO and project into it with `SELECT NEW`:

```php
<?php
// src/Dto/PostListItem.php

final class PostListItem
{
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly string $authorName,
    ) {}
}
```

```php
// src/Repository/PostRepository.php

/** @return PostListItem[] */
public function findPostListItems(): array
{
    return $this->createQueryBuilder('p')
        ->select('NEW App\Dto\PostListItem(p.id, p.title, a.name)')
        ->leftJoin('p.author', 'a')
        ->getQuery()
        ->getResult();
}
```

The constructor argument order must match the `NEW` argument order. The result
is an array of `PostListItem`, not managed entities — ideal for read-only lists.

## Batch Processing with Iteration

Process large datasets without memory issues:

```php
public function processAllPosts(): void
{
    $query = $this->createQueryBuilder('p')
        ->getQuery();

    foreach ($query->toIterable() as $post) {
        $this->process($post);

        // Clear entity manager periodically
        $this->em->clear(Post::class);
    }
}
```

## Proxy Objects

Understanding lazy loading:

```php
// $post->getAuthor() returns a Proxy, not User
$author = $post->getAuthor();

// Proxy is a subclass of User
$author instanceof User; // true

// Check if proxy is initialized
$em->getUnitOfWork()->isInIdentityMap($author); // true if loaded

// Force initialization
$em->getUnitOfWork()->initializeObject($author);
```

## Preventing N+1

### The Problem

```php
// N+1 queries!
$posts = $repository->findAll();
foreach ($posts as $post) {
    echo $post->getAuthor()->getName(); // Query per iteration
}
```

### The Solution

```php
// Single query with join
$posts = $repository->createQueryBuilder('p')
    ->addSelect('a')
    ->leftJoin('p.author', 'a')
    ->getQuery()
    ->getResult();

foreach ($posts as $post) {
    echo $post->getAuthor()->getName(); // No extra query
}
```

## Query Hints

```php
use Doctrine\ORM\Query;

$query = $em->createQuery('SELECT p FROM Post p');

// Force refresh from database
$query->setHint(Query::HINT_REFRESH, true);

// Custom output walker for soft deletes
$query->setHint(
    Query::HINT_CUSTOM_OUTPUT_WALKER,
    'Gedmo\SoftDeleteable\Query\TreeWalker\SoftDeleteableWalker'
);
```

## Index By for Fast Lookups

```php
public function findAllIndexedById(): array
{
    return $this->createQueryBuilder('p', 'p.id')  // Index by ID
        ->getQuery()
        ->getResult();
}

// Returns ['1' => Post, '2' => Post, ...]
$posts = $repository->findAllIndexedById();
$post = $posts[42]; // Direct access, no loop needed
```

## Read-Only Queries

Skip change tracking for read-only data:

```php
public function findForDisplay(): array
{
    return $this->createQueryBuilder('p')
        ->getQuery()
        ->setHint(Query::HINT_READ_ONLY, true)
        ->getResult();
}
```

## Best Practices

1. **Default to LAZY**: Most relations don't need eager loading
2. **EXTRA_LAZY for large collections**: count(), contains(), slice()
3. **Join fetch in repositories**: Explicit control over loading
4. **Avoid EAGER on mapping**: Fetch join in the query is better
5. **DTO (`SELECT NEW`) for lists**: Replaces the removed `partial` keyword
6. **Batch with `toIterable()`**: For large dataset processing
7. **Profile queries**: Use Symfony profiler to spot N+1

## DBAL 4 — method-based API

When you drop to raw SQL (reports, projections, bulk reads), DBAL 4 is
method-based. The old `query()` / `exec()` / `fetchAll()` were removed:

```php
use Doctrine\DBAL\Connection;

// Reads
$rows  = $connection->fetchAllAssociative('SELECT id, title FROM post');
$row   = $connection->fetchAssociative('SELECT * FROM post WHERE id = ?', [$id]);
$value = $connection->fetchOne('SELECT COUNT(*) FROM post');
$stmt  = $connection->executeQuery('SELECT * FROM post WHERE status = ?', [$status]);

// Writes (returns affected-row count)
$affected = $connection->executeStatement(
    'UPDATE post SET status = ? WHERE status = ?',
    ['archived', 'draft'],
);
```

## Applicability

- **ORM 3.x / DBAL 4.x** (target): no `partial` keyword,
  no `HINT_FORCE_PARTIAL_LOAD`, no `Query::setFetchMode()`; use `SELECT NEW`
  DTOs and fetch joins. DBAL `query()`/`exec()`/`fetchAll()` removed.
- **ORM 2.x (legacy)**: `partial` still parses but is deprecated — migrate to
  DTO hydration before upgrading to 3.0.


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

