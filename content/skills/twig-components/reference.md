# Reference

# Twig Components (Symfony UX)

## Installation

```bash
composer require symfony/ux-twig-component
# For reactive components
composer require symfony/ux-live-component
```

## Basic Twig Component

### Create Component Class

```php
<?php
// src/Twig/Components/Alert.php

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class Alert
{
    public string $type = 'info';
    public string $message;
    public bool $dismissible = false;
}
```

### Create Template

```twig
{# templates/components/Alert.html.twig #}
<div class="alert alert-{{ type }}{% if dismissible %} alert-dismissible{% endif %}" role="alert">
    {{ message }}
    {% if dismissible %}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    {% endif %}
</div>
```

### Use Component

```twig
{# In any template #}
<twig:Alert type="success" message="Operation completed!" />
<twig:Alert type="danger" message="An error occurred" dismissible />
```

## Component with Slots

### Component Class

```php
<?php
// src/Twig/Components/Card.php

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class Card
{
    public ?string $title = null;
    public string $class = '';
}
```

### Template with Slots

```twig
{# templates/components/Card.html.twig #}
<div class="card {{ class }}">
    {% if title %}
        <div class="card-header">
            <h5 class="card-title">{{ title }}</h5>
        </div>
    {% endif %}

    <div class="card-body">
        {% block content %}{% endblock %}
    </div>

    {% if block('footer') is not empty %}
        <div class="card-footer">
            {% block footer %}{% endblock %}
        </div>
    {% endif %}
</div>
```

### Usage

```twig
<twig:Card title="User Profile">
    <twig:block name="content">
        <p>Name: {{ user.name }}</p>
        <p>Email: {{ user.email }}</p>
    </twig:block>

    <twig:block name="footer">
        <a href="{{ path('user_edit', {id: user.id}) }}" class="btn btn-primary">Edit</a>
    </twig:block>
</twig:Card>
```

## Component with Logic

```php
<?php
// src/Twig/Components/UserCard.php

namespace App\Twig\Components;

use App\Entity\User;
use App\Repository\PostRepository;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class UserCard
{
    public User $user;

    public function __construct(
        private PostRepository $postRepository,
    ) {}

    public function getPostCount(): int
    {
        return $this->postRepository->countByAuthor($this->user);
    }

    public function getRecentPosts(): array
    {
        return $this->postRepository->findRecentByAuthor($this->user, 3);
    }
}
```

```twig
{# templates/components/UserCard.html.twig #}
<div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>{{ this.postCount }} posts</p>

    <ul>
    {% for post in this.recentPosts %}
        <li>{{ post.title }}</li>
    {% endfor %}
    </ul>
</div>
```

## readonly caveat

Do **not** mark a Twig component class or its public props as `readonly`: props
are assigned *after* instantiation, so a readonly public prop throws. Inject
services as `private readonly`, but keep public props mutable.

```php
#[AsTwigComponent]
class Alert
{
    public function __construct(
        private readonly LoggerInterface $logger,   // services: readonly OK
    ) {}

    public string $type = 'info';   // props: must stay mutable, no readonly
    public string $message = '';
}
```

If the class must be `readonly`, assign the props inside `mount()` instead.

## Anonymous Components

A component with no PHP class — the name comes from the template path. Declare
its props with `{% props %}`:

```twig
{# templates/components/Button.html.twig #}
{% props variant = 'primary', label %}
<button class="btn btn-{{ variant }}" {{ attributes }}>{{ label }}</button>
```

```twig
<twig:Button variant="danger" label="Delete" type="submit" />
```

## CVA (Class Variant Authority)

Manage Tailwind/utility class variants with `html_cva` (from
`twig/html-extra` >= 3.12) and merge conflicting classes with `|tailwind_merge`:

```twig
{# templates/components/Badge.html.twig #}
{% set badge = html_cva(
    base: 'inline-flex items-center rounded px-2 py-1 text-xs font-medium',
    variants: {
        color: { gray: 'bg-gray-100 text-gray-800', red: 'bg-red-100 text-red-800' },
        size:  { sm: 'text-xs', md: 'text-sm' },
    }
) %}
<span class="{{ badge.apply({color, size}, attributes.render('class'))|tailwind_merge }}">
    {{ label }}
</span>
```

## Testing Components

```php
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\UX\TwigComponent\Test\InteractsWithTwigComponents;

final class AlertTest extends KernelTestCase
{
    use InteractsWithTwigComponents;

    public function testMount(): void
    {
        $component = $this->mountTwigComponent(name: 'Alert', data: ['message' => 'Hi']);
        self::assertSame('info', $component->type);
    }

    public function testRender(): void
    {
        $rendered = $this->renderTwigComponent(name: 'Alert', data: ['message' => 'Hi']);
        self::assertStringContainsString('Hi', (string) $rendered);
    }
}
```

## Live Components (Reactive)

### Counter Example

```php
<?php
// src/Twig/Components/Counter.php

namespace App\Twig\Components;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class Counter
{
    use DefaultActionTrait;

    #[LiveProp(writable: true)]
    public int $count = 0;

    #[LiveAction]
    public function increment(): void
    {
        $this->count++;
    }

    #[LiveAction]
    public function decrement(): void
    {
        $this->count--;
    }
}
```

```twig
{# templates/components/Counter.html.twig #}
<div {{ attributes }}>
    <span>Count: {{ count }}</span>
    <button data-action="live#action" data-live-action-param="decrement">-</button>
    <button data-action="live#action" data-live-action-param="increment">+</button>
</div>
```

### Search Component

```php
<?php
// src/Twig/Components/ProductSearch.php

namespace App\Twig\Components;

use App\Repository\ProductRepository;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class ProductSearch
{
    use DefaultActionTrait;

    #[LiveProp(writable: true, url: true)]
    public string $query = '';

    #[LiveProp(writable: true)]
    public int $page = 1;

    public function __construct(
        private ProductRepository $products,
    ) {}

    public function getProducts(): array
    {
        if (strlen($this->query) < 2) {
            return [];
        }

        return $this->products->search($this->query, $this->page);
    }
}
```

```twig
{# templates/components/ProductSearch.html.twig #}
<div {{ attributes }}>
    <input
        type="search"
        data-model="query"
        placeholder="Search products..."
        class="form-control"
    >

    <div class="results mt-3">
        {% for product in this.products %}
            <div class="product-card">
                <h4>{{ product.name }}</h4>
                <p>{{ product.price|format_currency('EUR') }}</p>
            </div>
        {% else %}
            {% if query|length >= 2 %}
                <p>No products found.</p>
            {% endif %}
        {% endfor %}
    </div>
</div>
```

### Form Component

```php
<?php
// src/Twig/Components/ContactForm.php

namespace App\Twig\Components;

use App\Form\ContactType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\ComponentWithFormTrait;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class ContactForm extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    #[LiveProp]
    public bool $submitted = false;

    protected function instantiateForm(): FormInterface
    {
        return $this->createForm(ContactType::class);
    }

    #[LiveAction]
    public function submit(): void
    {
        $this->submitForm();

        if ($this->getForm()->isValid()) {
            $data = $this->getForm()->getData();
            // Process form...
            $this->submitted = true;
        }
    }
}
```

```twig
{# templates/components/ContactForm.html.twig #}
<div {{ attributes }}>
    {% if submitted %}
        <div class="alert alert-success">Thank you for your message!</div>
    {% else %}
        {{ form_start(form) }}
            {{ form_row(form.name) }}
            {{ form_row(form.email) }}
            {{ form_row(form.message) }}

            <button
                type="submit"
                data-action="live#action"
                data-live-action-param="submit"
                class="btn btn-primary"
            >
                Send
            </button>
        {{ form_end(form) }}
    {% endif %}
</div>
```

## Best Practices

1. **Keep components focused**: Single responsibility
2. **Use slots for flexibility**: Allow content injection
3. **LiveProp for state**: Mark writable props explicitly
4. **Debounce search**: Use `data-model="debounce(300)|query"`
5. **URL sync**: Use `url: true` for bookmarkable state
6. **Test components**: Unit test the PHP class


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- rg --files
- composer validate
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

