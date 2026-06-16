# Reference

# Doctrine Batch Processing

## The Problem

```php
// BAD: Loads all entities into memory
$products = $repository->findAll();
foreach ($products as $product) {
    $this->process($product);
}
// Out of Memory with large datasets!
```

## Solution 1: Iterate with toIterable()

```php
<?php

// GOOD: Process one at a time
$query = $em->createQuery('SELECT p FROM Product p');

foreach ($query->toIterable() as $product) {
    $this->process($product);

    // Clear managed entities periodically
    $em->clear();
}
```

> **ORM 3 breaking change**: `Query#iterate()` was deprecated in ORM 2.7 and
> **removed in ORM 3.0**. Use `toIterable()` (available since 2.7, the only
> option in 3.x/4.x). You cannot iterate a query that fetch-joins a
> collection-valued association.

## Solution 2: Batch with Clear

```php
<?php

const BATCH_SIZE = 100;

$query = $em->createQuery('SELECT p FROM Product p');
$i = 0;

foreach ($query->toIterable() as $product) {
    $product->setProcessedAt(new \DateTimeImmutable());
    $i++;

    if ($i % self::BATCH_SIZE === 0) {
        $em->flush();
        $em->clear();
        gc_collect_cycles();
    }
}

// Flush remaining
$em->flush();
$em->clear();
```

## Solution 3: ID-Based Pagination

```php
<?php

class BatchProcessor
{
    private const BATCH_SIZE = 1000;

    public function processAll(): void
    {
        $lastId = 0;

        while (true) {
            $products = $this->em->createQueryBuilder()
                ->select('p')
                ->from(Product::class, 'p')
                ->where('p.id > :lastId')
                ->setParameter('lastId', $lastId)
                ->orderBy('p.id', 'ASC')
                ->setMaxResults(self::BATCH_SIZE)
                ->getQuery()
                ->getResult();

            if (empty($products)) {
                break;
            }

            foreach ($products as $product) {
                $this->process($product);
                $lastId = $product->getId();
            }

            $this->em->flush();
            $this->em->clear();
        }
    }
}
```

## Solution 3b: DQL Bulk UPDATE / DELETE

For mass updates/deletes, a single DQL `UPDATE`/`DELETE` statement is the most
efficient — it bypasses hydration and the unit of work entirely:

```php
<?php

// Bulk update — runs one SQL UPDATE, no entities loaded
$updated = $em->createQuery(
    'UPDATE App\Entity\Product p SET p.price = p.price * 0.9 WHERE p.discontinued = true'
)->execute();

// Bulk delete
$deleted = $em->createQuery(
    'DELETE App\Entity\Product p WHERE p.createdAt < :cutoff'
)->setParameter('cutoff', new \DateTimeImmutable('-1 year'))
 ->execute();
```

DQL UPDATE/DELETE do **not** trigger lifecycle events or update already-managed
objects in memory — clear or re-fetch afterwards if you keep working with them.

## Solution 4: DBAL for Bulk Updates

```php
<?php

use Doctrine\DBAL\Connection;

class BulkUpdater
{
    public function __construct(
        private Connection $connection,
    ) {}

    public function markAllProcessed(): int
    {
        return $this->connection->executeStatement(
            'UPDATE product SET processed_at = NOW() WHERE processed_at IS NULL'
        );
    }

    public function updatePrices(array $updates): void
    {
        $this->connection->beginTransaction();

        try {
            $stmt = $this->connection->prepare(
                'UPDATE product SET price = :price WHERE id = :id'
            );

            foreach ($updates as $id => $price) {
                $stmt->executeStatement(['id' => $id, 'price' => $price]);
            }

            $this->connection->commit();
        } catch (\Exception $e) {
            $this->connection->rollBack();
            throw $e;
        }
    }
}
```

## Solution 5: Bulk Insert

```php
<?php

class BulkInserter
{
    private const BATCH_SIZE = 500;

    public function importProducts(array $data): void
    {
        // NOTE: in ORM 2.x you would call
        // $this->em->getConnection()->getConfiguration()->setSQLLogger(null);
        // to avoid memory growth. That method is DEPRECATED in DBAL 3+ and gone
        // in DBAL 4 (logging moved to PSR-3 middleware). On ORM 3 / DBAL 4 you
        // disable logging via configuration instead of this call.

        $batches = array_chunk($data, self::BATCH_SIZE);

        foreach ($batches as $batch) {
            foreach ($batch as $item) {
                $product = new Product();
                $product->setName($item['name']);
                $product->setPrice($item['price']);
                $this->em->persist($product);
            }

            $this->em->flush();
            $this->em->clear();
        }
    }
}
```

## Memory Monitoring

```php
<?php

class BatchProcessor
{
    public function process(): void
    {
        $startMemory = memory_get_usage();

        foreach ($query->toIterable() as $i => $entity) {
            $this->processEntity($entity);

            if ($i % 100 === 0) {
                $this->em->clear();

                $currentMemory = memory_get_usage();
                $this->logger->info('Batch progress', [
                    'processed' => $i,
                    'memory_mb' => round($currentMemory / 1024 / 1024, 2),
                    'memory_delta_mb' => round(($currentMemory - $startMemory) / 1024 / 1024, 2),
                ]);
            }
        }
    }
}
```

## Symfony Command for Batch Processing

```php
<?php
// src/Command/ProcessProductsCommand.php

#[AsCommand(name: 'app:process-products')]
class ProcessProductsCommand extends Command
{
    private const BATCH_SIZE = 100;

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $query = $this->em->createQuery('SELECT p FROM Product p WHERE p.processedAt IS NULL');
        $total = $this->countUnprocessed();

        $io->progressStart($total);

        $processed = 0;
        foreach ($query->toIterable() as $product) {
            $this->processor->process($product);
            $processed++;

            if ($processed % self::BATCH_SIZE === 0) {
                $this->em->flush();
                $this->em->clear();
                $io->progressAdvance(self::BATCH_SIZE);
            }
        }

        $this->em->flush();
        $io->progressFinish();

        $io->success("Processed {$processed} products");

        return Command::SUCCESS;
    }
}
```

## Best Practices

1. **Clear regularly**: `$em->clear()` releases memory
2. **Use toIterable()**: Don't load all results at once
3. **DQL UPDATE/DELETE or DBAL for bulk writes**: Skip hydration for mass updates
4. **Monitor memory**: Log memory usage in long processes
5. **Disable SQL logging**: Via config/middleware on DBAL 4 (`setSQLLogger()` is gone)
6. **Progress feedback**: Use SymfonyStyle progress bars

## Applicability

- **ORM 3.x / DBAL 4.x** (target): `toIterable()` only; `Query#iterate()` removed;
  `setSQLLogger()` removed (PSR-3 middleware instead).
- **ORM 2.7+ (legacy)**: `toIterable()` available alongside the deprecated
  `iterate()`; prefer `toIterable()`.


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

