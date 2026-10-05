---
name: writing-plans
description: Create structured implementation plans for Symfony features with clear steps, dependencies, and acceptance criteria
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Writing Plans (Symfony)

## Use when
- A feature touches several layers: entities, services, API, async work.
- The work must be reviewed, or split across sessions, before coding starts.
- Scope and risks must be known before committing to an approach.

## Default workflow
1. Write the overview: summary, scope in and out, dependencies.
2. Design the changes: new and modified entities, services and handlers, API endpoints.
3. Break the work into phases of atomic steps, each starting with its test.
4. Mark the dependencies between steps and size each one (S, M, L).
5. Write the acceptance criteria, and the risks with their mitigation.

## Guardrails
- Every step can be completed and tested on its own.
- Name concrete files, classes and endpoints, not intentions.
- List what is out of scope instead of dropping it silently.
- Start from a template in `reference.md` (CRUD, background job, integration) when one fits.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- A plan with overview, design, steps, acceptance criteria and risks.
- Step dependencies and sizes.
- Open questions for the reviewer.

## References
- `reference.md`
