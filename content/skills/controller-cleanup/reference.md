# Reference

# Controller Cleanup

## The Problem: Fat Controllers

```php
// BAD: Fat controller with too much logic
#[Route('/orders', methods: ['POST'])]
public function create(Request $request): Response
{
    $data = json_decode($request->getContent(), true);

    // Validation logic in controller
    if (empty($data['items'])) {
        return new JsonResponse(['error' => 'Items required'], 400);
    }

    // Business logic in controller
    $order = new Order();
    $order->setCustomer($this->getUser());
    $order->setStatus('pending');

    $total = 0;
    foreach ($data['items'] as $itemData) {
        $product = $this->em->find(Product::class, $itemData['productId']);
        if (!$product) {
            return new JsonResponse(['error' => 'Product not found'], 400);
        }

        if ($product->getStock() < $itemData['quantity']) {
            return new JsonResponse(['error' => 'Insufficient stock'], 400);
        }

        $item = new OrderItem();
        $item->setProduct($product);
        $item->setQuantity($itemData['quantity']);
        $item->setPrice($product->getPrice());
        $order->addItem($item);

        $total += $product->getPrice() * $itemData['quantity'];
        $product->setStock($product->getStock() - $itemData['quantity']);
    }

    $order->setTotal($total);

    // Coupon logic
    if (!empty($data['coupon'])) {
        $coupon = $this->em->getRepository(Coupon::class)
            ->findOneBy(['code' => $data['coupon']]);
        if ($coupon && $coupon->isValid()) {
            $discount = $total * ($coupon->getDiscount() / 100);
            $order->setDiscount($discount);
            $order->setTotal($total - $discount);
        }
    }

    $this->em->persist($order);
    $this->em->flush();

    // Send email
    $email = (new Email())
        ->to($this->getUser()->getEmail())
        ->subject('Order Confirmation')
        ->text('Your order has been placed.');
    $this->mailer->send($email);

    return new JsonResponse(['id' => $order->getId()], 201);
}
```

## The Solution: Lean Controller

### Step 1: Extract to Service

```php
<?php
// src/Service/OrderService.php

namespace App\Service;

use App\Dto\CreateOrderRequest;
use App\Entity\Order;
use App\Entity\User;

class OrderService
{
    public function __construct(
        private ProductService $products,
        private CouponService $coupons,
        private EntityManagerInterface $em,
        private OrderNotificationService $notifications,
    ) {}

    public function createOrder(User $user, CreateOrderRequest $request): Order
    {
        // Validate and reserve products
        $items = $this->products->reserveItems($request->items);

        // Create order
        $order = Order::create($user, $items);

        // Apply coupon if provided
        if ($request->couponCode) {
            $discount = $this->coupons->apply($request->couponCode, $order);
            $order->applyDiscount($discount);
        }

        $this->em->persist($order);
        $this->em->flush();

        // Async notification
        $this->notifications->orderCreated($order);

        return $order;
    }
}
```

### Step 2: Use DTOs for Input

```php
<?php
// src/Dto/CreateOrderRequest.php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateOrderRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Count(min: 1)]
        #[Assert\Valid]
        public array $items,

        public ?string $couponCode = null,
    ) {}
}
```

### Step 3: Lean Controller

```php
<?php
// src/Controller/Api/OrderController.php

namespace App\Controller\Api;

use App\Dto\CreateOrderRequest;
use App\Service\OrderService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/orders')]
class OrderController extends AbstractController
{
    public function __construct(
        private OrderService $orderService,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(
        #[MapRequestPayload] CreateOrderRequest $request
    ): JsonResponse {
        $order = $this->orderService->createOrder(
            $this->getUser(),
            $request
        );

        return new JsonResponse(['id' => $order->getId()], 201);
    }
}
```

## Controller Patterns

### Maximum 5-10 Lines Per Action

```php
#[Route('/posts/{id}', methods: ['PUT'])]
public function update(
    Post $post,
    #[MapRequestPayload] UpdatePostRequest $request
): JsonResponse {
    $this->denyAccessUnlessGranted('EDIT', $post);

    $post = $this->postService->update($post, $request);

    return new JsonResponse(PostOutput::fromEntity($post));
}
```

### Use Attributes for Common Tasks

```php
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/users')]
#[IsGranted('ROLE_ADMIN')]
class AdminUserController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(): Response
    {
        // Already authorized by class attribute
    }
}
```

### MapRequestPayload for Input

```php
#[Route('/contact', methods: ['POST'])]
public function contact(
    #[MapRequestPayload] ContactRequest $request
): JsonResponse {
    // $request is already validated
    $this->contactService->send($request);

    return new JsonResponse(['status' => 'sent']);
}
```

### EntityValueResolver for Entities

The legacy SensioFrameworkExtraBundle `ParamConverter` is gone; Doctrine's
built-in `EntityValueResolver` maps route parameters to entities automatically.

```php
// {id} is resolved to the Post entity by the EntityValueResolver
#[Route('/posts/{id}', methods: ['GET'])]
public function show(Post $post): Response
{
    // 404 handled automatically if not found
    return $this->render('post/show.html.twig', ['post' => $post]);
}
```

Use `#[MapEntity]` to control the lookup (non-id field, custom expression, etc.):

```php
use Symfony\Bridge\Doctrine\Attribute\MapEntity;

#[Route('/posts/{slug}', methods: ['GET'])]
public function showBySlug(
    #[MapEntity(mapping: ['slug' => 'slug'])] Post $post,
): Response {
    return $this->render('post/show.html.twig', ['post' => $post]);
}
```

### Inject per-argument, never pull from the container

Type-hint the services you need as action arguments (or constructor args). Don't
reach into the container with `$this->container->get(...)` / `$this->get(...)` —
that hides dependencies and breaks autowiring/testing.

```php
// GOOD — explicit, autowired, testable
#[Route('/reports', methods: ['GET'])]
public function reports(ReportBuilder $reports): Response
{
    return $this->json($reports->forCurrentUser($this->getUser()));
}

// BAD
// $reports = $this->container->get(ReportBuilder::class);
```

### Console: invokable commands (no base class)

The same "thin entry point + service" discipline applies to commands. Since
Symfony 7.3 an `#[AsCommand]` class with `__invoke()` no longer needs to extend
`Command`:

```php
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:create-user', description: 'Creates a user.')]
final class CreateUserCommand
{
    public function __construct(private UserService $users) {}

    public function __invoke(
        SymfonyStyle $io,
        #[Argument('The username.')] string $username,
    ): int {
        $this->users->create($username);
        $io->success("Created {$username}");

        return Command::SUCCESS;
    }
}
```

## Extract Responsibilities

### Validation → DTO + Validator

```php
// DTO handles validation rules
final readonly class CreateUserRequest
{
    #[Assert\NotBlank]
    #[Assert\Email]
    public string $email;

    #[Assert\NotBlank]
    #[Assert\Length(min: 8)]
    public string $password;
}
```

### Business Logic → Service

```php
// Service handles business rules
class UserService
{
    public function register(CreateUserRequest $request): User
    {
        $this->ensureEmailUnique($request->email);
        $user = User::register($request->email, $request->password);
        $this->em->persist($user);
        $this->em->flush();
        return $user;
    }
}
```

### Authorization → Voter

```php
// Voter handles access control
class PostVoter extends Voter
{
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        return match ($attribute) {
            'EDIT' => $subject->getAuthor() === $token->getUser(),
            default => false,
        };
    }
}
```

### Notifications → Events/Messages

```php
// Async via Messenger
class OrderService
{
    public function create(CreateOrderRequest $request): Order
    {
        // ... create order
        $this->bus->dispatch(new SendOrderConfirmation($order->getId()));
        return $order;
    }
}
```

## Testing Lean Controllers

```php
class OrderControllerTest extends WebTestCase
{
    public function testCreateOrder(): void
    {
        $user = UserFactory::createOne();
        ProductFactory::createMany(3);

        $this->client->loginUser($user->object());
        $this->client->request('POST', '/api/orders', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'items' => [
                ['productId' => 1, 'quantity' => 2],
            ],
        ]));

        $this->assertResponseStatusCodeSame(201);
    }
}
```

## Checklist

- [ ] Controller actions ≤ 10 lines
- [ ] No `new Entity()` in controller
- [ ] No direct EntityManager usage
- [ ] Use DTOs for input
- [ ] Use services for business logic
- [ ] Use voters for authorization
- [ ] Use events/messages for side effects


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

