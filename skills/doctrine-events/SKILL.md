---

name: symfony:doctrine-events
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: React to Doctrine entity lifecycle (persist/update/remove/load) in Symfony using attribute-based listeners, entity listeners, and lifecycle callbacks. Use for doctrine events tasks on ORM 3.x.
---

# Doctrine Events (Symfony)

## Use when
- You need side effects on entity persistence (timestamps, slugs, search indexing, notifications).
- Migrating an `EventSubscriberInterface` Doctrine subscriber to ORM 3.
- Choosing between lifecycle callbacks, entity listeners, and global lifecycle listeners.

## Default workflow
1. Pick the narrowest mechanism: callback (one entity, no deps) → entity listener (one entity, needs services) → lifecycle listener (cross-cutting, all entities).
2. Wire it with attributes (`#[ORM\HasLifecycleCallbacks]`, `#[AsEntityListener]`, `#[AsDoctrineListener]`).
3. Type the event argument by its per-event class (`PostPersistEventArgs`, `PreUpdateEventArgs`, …).
4. Verify the side effect fires with a targeted functional test against a real DB.

## Guardrails
- ORM 3.0 removed `EventSubscriberInterface` Doctrine subscribers — never reintroduce them.
- Type-check the entity early in a global lifecycle listener (it fires for every entity).
- Never call `flush()` inside a Doctrine event handler — it corrupts the in-flight unit of work.
- `preUpdate` is restricted: change fields only via `$args->setNewValue()`, never touch associations.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open `reference.md` for the three mechanisms, the event-args matrix, and migration from subscribers.

## Output contract
- Listener/callback class with the correct attribute.
- Justification for the chosen mechanism.
- Validation outcomes (test that the side effect fired).

## References
- `reference.md`
- `docs/complexity-tiers.md`
