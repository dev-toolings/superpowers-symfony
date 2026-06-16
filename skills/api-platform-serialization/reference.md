# Reference

# API Platform Serialization

> **Namespace note (Symfony 7+ / API Platform v4).** Serializer attributes live under `Symfony\Component\Serializer\Attribute\*` (renamed from `Annotation\*`): `Groups`, `Ignore`, `SerializedName`, `SerializedPath`, `Context`, `MaxDepth`, `DiscriminatorMap`. The old `Annotation\*` names still resolve but new code should use `Attribute\*`. The core serialization model (groups, contexts, `#[ApiProperty]`) is stable v3→v4.

## Property-level context — `#[Context]` (Symfony 7.0+)

Apply normalizer options per property (e.g. a date format) without a custom normalizer:

```php
use Symfony\Component\Serializer\Attribute\Context;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

class Event
{
    #[Groups(['event:read'])]
    #[Context([DateTimeNormalizer::FORMAT_KEY => 'Y-m-d'])]
    public \DateTimeImmutable $startsAt;

    // group-scoped context: only applies when serializing with the 'extended' group
    #[Context(normalizationContext: [DateTimeNormalizer::FORMAT_KEY => \DateTimeInterface::RFC3339], groups: ['extended'])]
    public \DateTimeImmutable $endsAt;
}
```

## Relations as IRIs — `readableLink` / `writableLink`

By default related resources are embedded only if they share a serialization group; otherwise they render as IRIs. Force the IRI form (never embed) with `#[ApiProperty]`:

```php
use ApiPlatform\Metadata\ApiProperty;

class Post
{
    #[ApiProperty(readableLink: false, writableLink: false)]
    #[Groups(['post:read'])]
    private User $author; // always serialized/accepted as an IRI, never embedded
}
```

## Serialization Groups

### Basic Groups

```php
<?php
// src/Entity/User.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    operations: [
        new GetCollection(
            normalizationContext: ['groups' => ['user:list']],
        ),
        new Get(
            normalizationContext: ['groups' => ['user:read']],
        ),
        new Post(
            denormalizationContext: ['groups' => ['user:create']],
        ),
        new Put(
            denormalizationContext: ['groups' => ['user:update']],
        ),
    ],
)]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:list', 'user:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['user:list', 'user:read', 'user:create', 'user:update'])]
    private string $name;

    #[ORM\Column(length: 255, unique: true)]
    #[Groups(['user:read', 'user:create'])] // Not in list, not updatable
    private string $email;

    #[ORM\Column]
    #[Groups(['user:create'])] // Write-only
    private string $password;

    #[ORM\Column]
    #[Groups(['user:read'])] // Read-only, not in list
    private \DateTimeImmutable $createdAt;

    #[ORM\OneToMany(targetEntity: Post::class, mappedBy: 'author')]
    #[Groups(['user:read'])] // Only on detail view
    private Collection $posts;
}
```

### Nested Serialization

```php
<?php
// src/Entity/Post.php

#[ApiResource(
    normalizationContext: ['groups' => ['post:read']],
)]
class Post
{
    #[Groups(['post:read', 'user:read'])]
    private ?int $id = null;

    #[Groups(['post:read', 'user:read'])]
    private string $title;

    #[Groups(['post:read'])] // Full content only on post detail
    private string $content;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[Groups(['post:read'])]
    private User $author;
}

// src/Entity/User.php
class User
{
    // When user:read includes posts, only id and title are shown
    #[Groups(['user:read'])]
    private Collection $posts;
}
```

## Custom Normalizers

### Add Computed Fields

```php
<?php
// src/Serializer/Normalizer/UserNormalizer.php

namespace App\Serializer\Normalizer;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

class UserNormalizer implements NormalizerInterface
{
    public function __construct(
        #[Autowire(service: 'serializer.normalizer.object')]
        private NormalizerInterface $normalizer,
    ) {}

    public function normalize(mixed $object, ?string $format = null, array $context = []): array
    {
        /** @var User $object */
        $data = $this->normalizer->normalize($object, $format, $context);

        // Add computed fields
        $data['fullName'] = $object->getFirstName() . ' ' . $object->getLastName();
        $data['postCount'] = $object->getPosts()->count();
        $data['isVerified'] = $object->getVerifiedAt() !== null;

        return $data;
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        return $data instanceof User;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [User::class => true];
    }
}
```

### Conditional Serialization

```php
<?php
// src/Serializer/Normalizer/PostNormalizer.php

namespace App\Serializer\Normalizer;

use App\Entity\Post;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

class PostNormalizer implements NormalizerInterface
{
    public function __construct(
        private NormalizerInterface $normalizer,
        private Security $security,
    ) {}

    public function normalize(mixed $object, ?string $format = null, array $context = []): array
    {
        /** @var Post $object */
        $data = $this->normalizer->normalize($object, $format, $context);

        // Add admin-only fields
        if ($this->security->isGranted('ROLE_ADMIN')) {
            $data['internalNotes'] = $object->getInternalNotes();
            $data['moderationStatus'] = $object->getModerationStatus();
        }

        // Add owner-only fields
        if ($this->security->getUser() === $object->getAuthor()) {
            $data['analytics'] = [
                'views' => $object->getViewCount(),
                'engagement' => $object->getEngagementRate(),
            ];
        }

        return $data;
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        return $data instanceof Post;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [Post::class => true];
    }
}
```

## Context Builders

### Dynamic Groups Based on User

```php
<?php
// src/Serializer/UserContextBuilder.php

namespace App\Serializer;

use ApiPlatform\Serializer\SerializerContextBuilderInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;

final class UserContextBuilder implements SerializerContextBuilderInterface
{
    public function __construct(
        private SerializerContextBuilderInterface $decorated,
        private Security $security,
    ) {}

    public function createFromRequest(Request $request, bool $normalization, ?array $extractedAttributes = null): array
    {
        $context = $this->decorated->createFromRequest($request, $normalization, $extractedAttributes);

        // Add admin group for admin users
        if ($this->security->isGranted('ROLE_ADMIN')) {
            $context['groups'][] = 'admin:read';
        }

        // Add owner group when viewing own resources
        $resourceClass = $context['resource_class'] ?? null;
        if ($resourceClass && $this->isOwner($request, $resourceClass)) {
            $context['groups'][] = 'owner:read';
        }

        return $context;
    }

    private function isOwner(Request $request, string $resourceClass): bool
    {
        // Implementation depends on your resource structure
        return false;
    }
}
```

Register as decorator:

```yaml
# config/services.yaml
services:
    App\Serializer\UserContextBuilder:
        decorates: 'api_platform.serializer.context_builder'
```

## Max Depth

Prevent circular references:

```php
use Symfony\Component\Serializer\Attribute\MaxDepth;

class User
{
    #[MaxDepth(1)]
    #[Groups(['user:read'])]
    private Collection $posts;
}

class Post
{
    #[MaxDepth(1)]
    #[Groups(['post:read'])]
    private User $author;
}
```

Enable in configuration:

```php
#[ApiResource(
    normalizationContext: [
        'groups' => ['post:read'],
        'enable_max_depth' => true,
    ],
)]
class Post { /* ... */ }
```

## Ignore Properties

```php
use Symfony\Component\Serializer\Attribute\Ignore;

class User
{
    #[Ignore]
    private string $password;

    #[Ignore]
    private string $resetToken;
}
```

## Best Practices

1. **Use groups consistently**: `entity:operation` naming convention
2. **Separate read/write groups**: Different fields for input/output
3. **Limit nested depth**: Use MaxDepth to prevent deep nesting
4. **Computed fields in normalizers**: Keep entities clean
5. **Context builders for dynamic groups**: Role-based field access
6. **Document with OpenAPI**: Groups affect schema generation


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

