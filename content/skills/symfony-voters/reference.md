# Symfony Voters Reference (Symfony)

Use this reference for implementation details and review criteria specific to `symfony-voters`.

## Anatomy of a voter

Extend `Voter` and implement `supports()` and `voteOnAttribute()`.

```php
<?php
// src/Security/Voter/PostVoter.php

namespace App\Security\Voter;

use App\Entity\Post;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class PostVoter extends Voter
{
    public const VIEW = 'POST_VIEW';
    public const EDIT = 'POST_EDIT';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT], true)
            && $subject instanceof Post;
    }

    // The optional `?Vote $vote = null` 4th argument lets the voter attach
    // human-readable reasons (surfaced via access_decision()).
    // Symfony 7.3+/8.x — recent; verify the minimum version. Keeping the
    // signature with `?Vote $vote = null` is backward-compatible.
    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null,
    ): bool {
        $user = $token->getUser();
        if (!$user instanceof User) {
            $vote?->addReason('The user is not authenticated.');
            return false;
        }

        /** @var Post $subject */
        return match ($attribute) {
            self::VIEW => $subject->isPublished() || $subject->getAuthor() === $user,
            self::EDIT => $this->canEdit($subject, $user, $vote),
            default => false,
        };
    }

    private function canEdit(Post $post, User $user, ?Vote $vote): bool
    {
        if ($post->getAuthor() !== $user) {
            $vote?->addReason('Only the author may edit this post.');
            $vote?->extraData['author_id'] = $post->getAuthor()->getId();
            return false;
        }
        return true;
    }
}
```

## Using voters

Controller attribute (preferred) — the second arg names the request attribute
holding the subject:

```php
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(PostVoter::EDIT, 'post', message: 'You cannot edit this post.', statusCode: 403)]
public function edit(Post $post): Response { /* ... */ }
```

Imperatively in a controller:

```php
$this->denyAccessUnlessGranted(PostVoter::EDIT, $post);
```

## Priority

`Voter` already implements `CacheableVoterInterface` (via `supports()`), so
`isGranted()` only calls voters whose `supportsType()`/`supportsAttribute()`
match. To order voters explicitly:

```php
use Symfony\Component\DependencyInjection\Attribute\AsTaggedItem;

#[AsTaggedItem(priority: 10)]   // higher priority runs first
final class PostVoter extends Voter {}
```

## Checking a role *inside* a voter

Never call `Security::isGranted()` inside a voter — it runs with the wrong token
context and can recurse. Inject `AccessDecisionManagerInterface` and use the
token you were handed:

```php
use Symfony\Component\Security\Core\Authorization\AccessDecisionManagerInterface;

public function __construct(
    private readonly AccessDecisionManagerInterface $accessDecisionManager,
) {}

// inside voteOnAttribute():
if ($this->accessDecisionManager->decide($token, ['ROLE_SUPER_ADMIN'])) {
    return true; // admins bypass ownership checks
}
```

## Access decision strategies

```yaml
# config/packages/security.yaml
security:
    access_decision_manager:
        strategy: affirmative    # affirmative (default) | consensus | unanimous | priority
        allow_if_all_abstain: false
```

| Strategy | Grants access when… |
|----------|---------------------|
| `affirmative` (default) | any voter grants |
| `consensus` | more voters grant than deny |
| `unanimous` | no voter denies |
| `priority` | the first non-abstaining voter decides |

Custom strategy: `strategy_service` implementing `AccessDecisionStrategyInterface`.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=Voter
- php bin/console debug:container security
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

