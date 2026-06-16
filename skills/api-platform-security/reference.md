# Reference

# API Platform Security

## Operation-Level Security

### Basic Security Expressions

```php
<?php
// src/Entity/Post.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;

#[ApiResource(
    operations: [
        // Public read access
        new GetCollection(),
        new Get(),

        // Authenticated users can create
        new Post(
            security: "is_granted('ROLE_USER')",
            securityMessage: 'You must be logged in to create posts.',
        ),

        // Only owner or admin can update
        new Put(
            security: "is_granted('ROLE_ADMIN') or object.getAuthor() == user",
            securityMessage: 'You can only edit your own posts.',
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object.getAuthor() == user",
        ),

        // Only admin can delete
        new Delete(
            security: "is_granted('ROLE_ADMIN')",
            securityMessage: 'Only administrators can delete posts.',
        ),
    ],
)]
class Post
{
    // ...
}
```

### Using Voters

```php
#[ApiResource(
    operations: [
        new Get(
            security: "is_granted('POST_VIEW', object)",
        ),
        new Put(
            security: "is_granted('POST_EDIT', object)",
            securityMessage: 'You cannot edit this post.',
        ),
        new Delete(
            security: "is_granted('POST_DELETE', object)",
        ),
    ],
)]
class Post { /* ... */ }
```

### Security Post-Denormalization

Check security after input is processed:

```php
#[ApiResource(
    operations: [
        new Post(
            // Check before processing
            security: "is_granted('ROLE_USER')",
            // Check after input is bound to object
            securityPostDenormalize: "is_granted('POST_CREATE', object)",
            securityPostDenormalizeMessage: 'You cannot create this type of post.',
        ),
    ],
)]
class Post { /* ... */ }
```

Useful when security depends on the input data itself.

### Security Post-Validation

`securityPostValidation` runs **after** the Symfony Validator has validated the object — so the expression can rely on the data being structurally valid. Useful when the authorization rule depends on a value that must first pass validation:

```php
#[ApiResource(
    operations: [
        new Post(
            security: "is_granted('ROLE_USER')",
            securityPostValidation: "is_granted('POST_PUBLISH', object)",
            securityPostValidationMessage: 'You cannot publish in this category.',
        ),
    ],
)]
class Post { /* ... */ }
```

Execution order: `security` (before denormalization) → denormalization → `securityPostDenormalize` → validation → `securityPostValidation`.

### Expression variables

| Variable | Available in | Meaning |
|---|---|---|
| `user` | all | current authenticated user |
| `object` | all | the resource (persisted state for `security`, request data for the post-* checks) |
| `request` | resource level only | current `Request` |
| `previous_object` | `securityPostDenormalize` only | clone of the object before denormalization (null on create) |

## Security Expressions Reference

```php
// User roles
security: "is_granted('ROLE_USER')"
security: "is_granted('ROLE_ADMIN')"

// Current user
security: "user == object.getOwner()"
security: "object.getAuthor().getId() == user.getId()"

// Object properties
security: "object.isPublished() or object.getAuthor() == user"
security: "object.getStatus() == 'draft' and object.getAuthor() == user"

// Voters
security: "is_granted('EDIT', object)"
security: "is_granted('VIEW', object)"

// Combined conditions
security: "is_granted('ROLE_ADMIN') or (is_granted('ROLE_USER') and object.getAuthor() == user)"

// Request data (for POST/PUT)
security: "is_granted('ROLE_ADMIN') or request.get('category') != 'restricted'"
```

## Collection Security

> **Rule.** Per-user collection filtering must happen at the **state provider / Doctrine query extension** level — **never** through a `security` expression. A `security` expression on a collection operation gates *access to the whole collection*; it cannot scope *which rows* a user sees. Use a `QueryCollectionExtensionInterface` (below) or a custom state provider.

### Filter Collections by User

```php
<?php
// src/Doctrine/CurrentUserExtension.php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Post;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

final class CurrentUserExtension implements QueryCollectionExtensionInterface
{
    public function __construct(
        private Security $security,
    ) {}

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // Only filter Post resources
        if ($resourceClass !== Post::class) {
            return;
        }

        // Admins see everything
        if ($this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        $user = $this->security->getUser();
        $alias = $queryBuilder->getRootAliases()[0];

        if ($user) {
            // Authenticated: see published + own drafts
            $queryBuilder
                ->andWhere(sprintf(
                    '%s.isPublished = true OR %s.author = :currentUser',
                    $alias,
                    $alias
                ))
                ->setParameter('currentUser', $user);
        } else {
            // Anonymous: only published
            $queryBuilder
                ->andWhere(sprintf('%s.isPublished = true', $alias));
        }
    }
}
```

### Filter Item Queries

```php
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;

final class CurrentUserExtension implements
    QueryCollectionExtensionInterface,
    QueryItemExtensionInterface
{
    public function applyToItem(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        array $identifiers,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // Same logic as collection
        $this->addWhere($queryBuilder, $resourceClass);
    }

    public function applyToCollection(/* ... */): void
    {
        $this->addWhere($queryBuilder, $resourceClass);
    }

    private function addWhere(QueryBuilder $queryBuilder, string $resourceClass): void
    {
        // Shared filtering logic
    }
}
```

## Property-Level Security

Hide fields based on permissions:

```php
<?php
// src/Entity/User.php

use Symfony\Component\Serializer\Attribute\Groups;

class User
{
    #[Groups(['user:read', 'admin:read'])]
    private ?int $id = null;

    #[Groups(['user:read', 'admin:read'])]
    private string $name;

    // Only visible to admins and the user themselves
    #[Groups(['user:owner', 'admin:read'])]
    private string $email;

    // Only visible to admins
    #[Groups(['admin:read'])]
    private array $roles;

    // Never exposed
    private string $password;
}
```

With context builder for dynamic groups:

```php
<?php
// src/Serializer/UserContextBuilder.php

final class UserContextBuilder implements SerializerContextBuilderInterface
{
    public function createFromRequest(Request $request, bool $normalization, ?array $extractedAttributes = null): array
    {
        $context = $this->decorated->createFromRequest($request, $normalization, $extractedAttributes);

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $context['groups'][] = 'admin:read';
        }

        // Check if viewing own profile
        $resourceId = $request->attributes->get('id');
        $currentUser = $this->security->getUser();
        if ($currentUser && $currentUser->getId() == $resourceId) {
            $context['groups'][] = 'user:owner';
        }

        return $context;
    }
}
```

## JWT Authentication

```yaml
# config/packages/security.yaml
security:
    firewalls:
        api:
            pattern: ^/api
            stateless: true
            jwt: ~

    access_control:
        - { path: ^/api/login, roles: PUBLIC_ACCESS }
        - { path: ^/api/docs, roles: PUBLIC_ACCESS }
        - { path: ^/api, roles: IS_AUTHENTICATED_FULLY }
```

## Rate Limiting

```php
use Symfony\Component\RateLimiter\Attribute\RateLimit;

#[ApiResource(
    operations: [
        new Post(
            security: "is_granted('ROLE_USER')",
        ),
    ],
)]
#[RateLimit(limit: 10, interval: '1 minute')]
class Comment { /* ... */ }
```

## Access decision reasons (Symfony 8.1+)

When you need the *reason* a decision was made (not just grant/deny) — e.g. to surface it in a response or log — use the access-decision helpers instead of a bare `isGranted()`:

```php
// Service: $security->getAccessDecision('POST_EDIT', $post) → AccessDecision with ->isGranted / ->message
$decision = $this->security->getAccessDecision('POST_EDIT', $post);
if (!$decision->isGranted) {
    // $decision->message carries the voter's reason (Vote::addReason)
}
```

```twig
{# Twig helper: access_decision('attr', subject).isGranted / .message #}
{% if not access_decision('POST_EDIT', post).isGranted %}
    <p>{{ access_decision('POST_EDIT', post).message }}</p>
{% endif %}
```

These pair with voters that attach reasons via the `?Vote $vote` argument (Symfony 7.3+) of `voteOnAttribute()`.

## Best Practices

1. **Use voters** for complex authorization logic
2. **Filter collections** with Doctrine extensions or a state provider — never a `security` expression
3. **Fail secure** - deny by default
4. **Clear error messages** - help users understand (surface `access_decision().message` when useful)
5. **Test security** - verify both grant and deny cases
6. **Audit sensitive operations** - log access attempts


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

