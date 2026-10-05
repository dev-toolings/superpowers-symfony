---
name: messenger-retry-failures
description: Handle message failures with retry strategies, failure transport, and recovery in Symfony Messenger (Recoverable/Unrecoverable exceptions)
capabilities: [read, search, edit, shell]
tags: [messenger]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
---

# Messenger Retry Failures (Symfony)

## Use when
- A handler fails and you must decide between retrying and giving up.
- Tuning `retry_strategy` (`max_retries`, `delay`, `multiplier`, `max_delay`) for a transport.
- Inspecting, retrying, or removing messages in the failure transport.
- Alerting when a message fails for good.

## Default workflow
1. Classify each failure: `UnrecoverableMessageHandlingException` when retrying cannot help, `RecoverableMessageHandlingException` when the cause is transient.
2. Set `retry_strategy` per transport and point `failure_transport` to a dedicated queue.
3. Implement `RetryStrategyInterface` only when the built-in backoff is not enough, and register it through `retry_strategy.service`.
4. Make the handler idempotent, with a stable idempotency key for external calls.
5. Triage with `messenger:failed:show`, then `messenger:failed:retry` or `messenger:failed:remove`.
6. Subscribe to `WorkerMessageFailedEvent` and alert only when `willRetry()` is false.

## Guardrails
- Never retry what cannot succeed, such as invalid input or a declined card.
- Keep `max_retries` modest (3-5 usually) with exponential backoff, so a failing service is not hammered.
- `retryDelay` and `forceRetry` on the recoverable exception are marked 8.1+ in the reference, and `forceRetry: true` goes past `max_retries`: verify the version before relying on them.
- `messenger:failed:retry` is interactive unless `--force`: read the message with `-vv` first.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The exception class chosen for each failure mode of the handler.
- Retry settings per transport, and the failure transport.
- The failed-message runbook (show, retry, remove) and the alert on final failure.

## References
- `reference.md`
