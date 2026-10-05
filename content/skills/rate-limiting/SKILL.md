---
name: rate-limiting
description: "Implement rate limiting with the Symfony RateLimiter (sliding window, token bucket, fixed window) and the #[RateLimit] controller attribute"
capabilities: [read, search, edit, shell]
tags: [security]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---
# Rate Limiting (Symfony)

## Use when
- Capping how often a caller may reach an endpoint: login, password reset, public API, any public write.
- Choosing between sliding window, token bucket and fixed window.
- Applying a limiter by controller attribute, in a service, or globally through an event subscriber.
- Returning a correct 429 with `Retry-After`.
- Blocking until a token frees up, rather than refusing outright.

## Default workflow
1. Name what is limited and what identifies the caller.
2. Pick the algorithm the traffic shape calls for, and state the rate and the burst.
3. Declare the policy under `framework.rate_limiter`, one entry per limiter.
4. Apply it where the request is refused, and answer 429 with `Retry-After`.
5. Prove the limit under test: the call that passes, the one refused, the reset.

## Guardrails
- The caller identity decides who is counted. Behind a proxy, an untrusted client address counts everyone as one.
- A limiter is not authorization. It caps a rate; it never decides a right.
- Refuse with 429 and `Retry-After`, never with a silent drop or a 500.
- A limiter whose storage is per process does not limit anything across several workers.
- Reserving tokens blocks the calling process: never on a web request.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Limiter policies, with the algorithm, the rate and the burst for each.
- Where each limiter is applied, and on what caller identity.
- The 429 response shape, headers included.
- Tests covering the accepted call, the refused one, and the reset.


## References
- `reference.md`
- `docs/complexity-tiers.md`
