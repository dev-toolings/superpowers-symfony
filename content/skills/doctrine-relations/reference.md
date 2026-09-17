# Doctrine Relations Reference (Symfony)

Use this reference for implementation details and review criteria specific to `doctrine-relations`.

Mapping is done with PHP attributes (`#[ORM\...]`). The mapping API is stable
across ORM 2.x/3.x; on ORM 3 the `targetEntity` can also be inferred from the
property type-hint, but passing it explicitly stays valid and is clearer.

## Owning vs Inverse side

| | Owning side | Inverse side |
|--|-------------|--------------|
| Mapping | `ManyToOne` (or owning `ManyToMany`/`OneToOne`) | `OneToMany` (or inverse side) |
| Database | holds the foreign key | no column |
| Updates DB | yes | only if the owning side is updated |

The single most common Doctrine bug: setting the relation on the **inverse**
side only. Doctrine persists what the **owning** side holds. Always set the
owning side (the `ManyToOne` reference).

## ManyToOne / OneToMany (the common pair)

### Owning side — `Product` holds the FK

```php
<?php
// src/Entity/Product.php

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Product
{
    #[ORM\ManyToOne(targetEntity: Category::class, inversedBy: 'products')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Category $category = null;

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): self
    {
        $this->category = $category;

        return $this;
    }
}
```

### Inverse side — `Category` owns a collection

```php
<?php
// src/Entity/Category.php

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Category
{
    /** @var Collection<int, Product> */
    #[ORM\OneToMany(targetEntity: Product::class, mappedBy: 'category', orphanRemoval: true)]
    private Collection $products;

    public function __construct()
    {
        $this->products = new ArrayCollection();
    }

    /** @return Collection<int, Product> */
    public function getProducts(): Collection
    {
        return $this->products;
    }

    public function addProduct(Product $product): self
    {
        if (!$this->products->contains($product)) {
            $this->products[] = $product;
            $product->setCategory($this); // keep both sides in sync
        }

        return $this;
    }

    public function removeProduct(Product $product): self
    {
        if ($this->products->removeElement($product)) {
            // unset the owning side only if it points here
            if ($product->getCategory() === $this) {
                $product->setCategory(null);
            }
        }

        return $this;
    }
}
```

### Persisting — set the owning side, then flush

```php
$product->setCategory($category);   // owning side carries the FK
$em->persist($category);
$em->persist($product);
$em->flush();
```

## orphanRemoval vs cascade

- **`cascade: ['persist', 'remove']`** — operations on the parent propagate to
  the associated entities. Useful for aggregate roots you always save together.
  Avoid `cascade: ['remove']` on large collections (issues a DELETE per row).
- **`orphanRemoval: true`** — when a child is *removed from the collection* (no
  longer referenced by the parent), Doctrine deletes it. Use it for true
  composition (a `Product` cannot exist without its `Category`), not for
  shared entities.

```php
#[ORM\OneToMany(targetEntity: OrderItem::class, mappedBy: 'order',
    cascade: ['persist'], orphanRemoval: true)]
private Collection $items;
```

## Fetching — avoid N+1

```php
// LAZY (default): triggers one extra query per access
$post = $em->find(Post::class, 1);
$post->getAuthor()->getName(); // 2nd query here

// Fetch join: one query, relation hydrated
$post = $repository->createQueryBuilder('p')
    ->addSelect('a')
    ->leftJoin('p.author', 'a')
    ->where('p.id = :id')
    ->setParameter('id', $id)
    ->getQuery()
    ->getOneOrNullResult();
```

## Pitfall: `contains()` on large inverse collections

On a plain `OneToMany`, calling `$category->getProducts()->contains($product)`
forces Doctrine to **hydrate the entire collection** into memory before
checking — disastrous for collections with thousands of rows.

```php
// BAD on a huge collection — loads everything
if ($category->getProducts()->contains($product)) { /* ... */ }
```

Mitigations:

- Mark the collection `fetch: 'EXTRA_LAZY'` so `contains()`, `count()` and
  `slice()` issue targeted SQL (`EXISTS`, `COUNT`, `LIMIT`) instead of loading
  the whole collection:

  ```php
  #[ORM\OneToMany(targetEntity: Product::class, mappedBy: 'category', fetch: 'EXTRA_LAZY')]
  private Collection $products;
  ```

- Or check membership from the owning side: `$product->getCategory() === $category`.

Always review the generated `add*/remove*` helpers (from `make:entity`) — they
call `contains()` and become a hot spot on large inverse collections.

## Multiple Entity Managers

A relation may **not** span two entity managers. When the schema is split, each
EM owns its own set of entities.

```yaml
# config/packages/doctrine.yaml
doctrine:
    dbal:
        connections:
            default:  { url: '%env(resolve:DATABASE_URL)%' }
            customer: { url: '%env(resolve:CUSTOMER_DATABASE_URL)%' }
        default_connection: default
    orm:
        default_entity_manager: default
        entity_managers:
            default:
                connection: default
                mappings:
                    Main:
                        is_bundle: false
                        dir: '%kernel.project_dir%/src/Entity/Main'
                        prefix: 'App\Entity\Main'
            customer:
                connection: customer
                mappings:
                    Customer:
                        is_bundle: false
                        dir: '%kernel.project_dir%/src/Entity/Customer'
                        prefix: 'App\Entity\Customer'
```

### Autowiring a named EM (by variable name)

The FrameworkBundle registers an alias per EM. Type-hint
`EntityManagerInterface` and **name the variable after the EM** to inject the
right one:

```php
use Doctrine\ORM\EntityManagerInterface;

public function __construct(
    private EntityManagerInterface $entityManager,         // default EM
    private EntityManagerInterface $customerEntityManager, // "customer" EM
) {}
```

> Relying on the variable name for autowiring resolution is convenient, but be
> aware Symfony 8.1+ deprecates name-based alias resolution in the general case;
> for Doctrine EMs the named alias is still the documented mechanism. Use
> `ManagerRegistry::getManager('customer')` when you need it explicitly.

### Repositories with multiple EMs

`getRepository()` takes the EM name as a second argument:

```php
use Doctrine\Persistence\ManagerRegistry;

$default  = $registry->getRepository(Product::class);              // default EM
$customer = $registry->getRepository(Customer::class, 'customer'); // named EM
```

For a custom repository on an entity managed by a non-default EM, extend
`Doctrine\ORM\EntityRepository` (**not** `ServiceEntityRepository`, whose
constructor resolves the EM from the entity class via the default manager) and
obtain it through `ManagerRegistry::getRepository()`.

### Console / migrations with `--em`

```bash
php bin/console doctrine:database:create --connection=customer
php bin/console doctrine:migrations:diff    --em=customer
php bin/console doctrine:migrations:migrate  --em=customer
```


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
