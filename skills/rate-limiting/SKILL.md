---

name: symfony:rate-limiting
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement rate limiting with the Symfony RateLimiter (sliding window, token bucket, fixed window) and the #[RateLimit] controller attribute
---

# Rate Limiting (Symfony)

## Use when
- Implementing asynchronous workflows with Messenger/Scheduler/Cache.
- Stabilizing retries and failure transports.

## Default workflow
1. Define async contract and delivery semantics.
2. Implement idempotent handlers and routing strategy.
3. Configure retries, failure transport, and observability.
4. Validate success/failure replay scenarios.

## Guardrails
- Assume at-least-once delivery, not exactly-once.
- Keep handlers deterministic and side-effect aware.
- Surface poison-message handling strategy.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Async config/handlers updated.
- Retry/failure policy decisions.
- Operational validation evidence.

## References
- `reference.md`
- `docs/complexity-tiers.md`
