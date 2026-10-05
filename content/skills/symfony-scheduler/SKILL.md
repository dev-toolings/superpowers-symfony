---
name: symfony-scheduler
description: Schedule recurring tasks with the Symfony Scheduler component (native since 7.x); define schedules, triggers, and integrate with Messenger
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

# Symfony Scheduler (Symfony)

## Use when
- Running recurring work (reports, cleanups, syncs) without system cron entries.
- Choosing between `RecurringMessage::every()`, `RecurringMessage::cron()`, and a custom `TriggerInterface`.
- Splitting jobs into several named schedules with `#[AsSchedule]`.
- Preventing overlap or lost runs of heavy scheduled tasks.

## Default workflow
1. Install `symfony/scheduler`, then write the message and its `#[AsMessageHandler]` handler.
2. Create a `#[AsSchedule('default')]` class implementing `ScheduleProviderInterface` and add `RecurringMessage` entries.
3. Pick the trigger: `every('5 minutes')` or `cron('0 */6 * * *')`, with an explicit timezone for cron.
4. Add `stateful($cache)` and `lock($lockFactory->createLock('scheduler'))` on the `Schedule` for heavy tasks.
5. Run it with `messenger:consume scheduler_default` under Supervisor, one process per schedule.
6. Log with `PreRunEvent` and `PostRunEvent`, and test the provider through `getRecurringMessages()` and `getNextRunDate()`.

## Guardrails
- Run a single consumer per schedule (`numprocs=1`) and add a lock, or the same task fires twice.
- Be explicit about timezones on every cron trigger.
- Scheduled handlers must be idempotent, since a run can be repeated.
- Use `--time-limit` with Supervisor `autorestart` so the long-lived worker recycles itself.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The schedule provider(s) with their triggers and timezone.
- The worker command and the Supervisor entry.
- The overlap policy (stateful, lock) and the monitoring hooks.

## References
- `reference.md`
