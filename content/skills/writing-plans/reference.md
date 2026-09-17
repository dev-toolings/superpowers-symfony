# Reference

# Writing Implementation Plans

Transform brainstorming results into actionable implementation plans.

## Plan Structure

### 1. Overview

```markdown
# Implementation Plan: [Feature Name]

## Summary
[1-2 sentence description of what we're building]

## Scope
- IN: [What's included]
- OUT: [What's explicitly excluded]

## Dependencies
- [Required packages]
- [Existing services/entities to modify]
- [External services]
```

### 2. Technical Design

```markdown
## Entities

### New Entity: Order
```php
#[ORM\Entity]
class Order
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    private User $customer;

    #[ORM\Column(type: 'string', enumType: OrderStatus::class)]
    private OrderStatus $status;

    #[ORM\OneToMany(targetEntity: OrderItem::class, mappedBy: 'order')]
    private Collection $items;
}
```

### Modified Entity: User
- Add `orders` OneToMany relation
```

### 3. Services & Handlers

```markdown
## Services

### OrderService
- `createOrder(User $user, array $items): Order`
- `calculateTotal(Order $order): Money`
- `validateStock(Order $order): bool`

### Message Handlers

### ProcessOrderHandler
- Triggered by: `ProcessOrder` message
- Actions:
  1. Validate stock
  2. Reserve items
  3. Dispatch `OrderProcessed` event
```

### 4. API Endpoints

```markdown
## API Endpoints

### POST /api/orders
- Request: `{items: [{productId, quantity}]}`
- Response: `201 Created` with Order resource
- Security: `ROLE_USER`

### GET /api/orders/{id}
- Response: Order resource
- Security: Owner or `ROLE_ADMIN`
```

### 5. Implementation Steps

```markdown
## Implementation Steps

### Phase 1: Foundation
1. [ ] Create `OrderStatus` enum
2. [ ] Create `Order` entity with migrations
3. [ ] Create `OrderItem` entity with migrations
4. [ ] Add relation to `User` entity
5. [ ] Run migrations

### Phase 2: Business Logic
6. [ ] Create `OrderService`
7. [ ] Create `ProcessOrder` message
8. [ ] Create `ProcessOrderHandler`
9. [ ] Write unit tests for service

### Phase 3: API
10. [ ] Configure API Platform resource
11. [ ] Add security voters
12. [ ] Write functional tests

### Phase 4: Integration
13. [ ] Connect to payment service
14. [ ] Add email notifications
15. [ ] End-to-end testing
```

### 6. Acceptance Criteria

```markdown
## Acceptance Criteria

- [ ] User can create order with multiple items
- [ ] Order total is calculated correctly
- [ ] Stock is validated before processing
- [ ] Only owner can view their orders
- [ ] Admin can view all orders
- [ ] Order status transitions are validated
- [ ] Email sent on order confirmation
```

### 7. Risks & Mitigations

```markdown
## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stock race condition | Medium | High | Use database locking |
| Payment failure | Low | High | Implement retry with Messenger |
| Performance on large orders | Low | Medium | Batch processing |
```

## Plan Templates

### CRUD Feature

```markdown
# Plan: [Entity] CRUD

## Entities
- [Entity] with fields: [list]

## Steps
1. [ ] Create entity + migration
2. [ ] Create Foundry factory
3. [ ] Configure API Platform resource
4. [ ] Add validation constraints
5. [ ] Add security voter
6. [ ] Write tests
```

### Background Job Feature

```markdown
# Plan: [Job Name]

## Messages
- [MessageName]: [trigger description]

## Handlers
- [HandlerName]: [processing steps]

## Steps
1. [ ] Create message class
2. [ ] Create handler
3. [ ] Configure routing in messenger.yaml
4. [ ] Add retry strategy
5. [ ] Write tests with in-memory transport
```

### Integration Feature

```markdown
# Plan: [Service] Integration

## External Service
- API: [URL/docs]
- Auth: [method]
- Rate limits: [limits]

## Steps
1. [ ] Create HTTP client service
2. [ ] Create DTOs for requests/responses
3. [ ] Implement retry logic
4. [ ] Add circuit breaker
5. [ ] Write tests with mocked responses
```

## Best Practices

1. **Atomic steps**: Each step should be completable independently
2. **Test-first**: Include test steps before implementation
3. **Dependencies clear**: Note which steps depend on others
4. **Reviewable**: Plan should be reviewable by team
5. **Time-boxed**: Add rough complexity indicators (S/M/L)


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

