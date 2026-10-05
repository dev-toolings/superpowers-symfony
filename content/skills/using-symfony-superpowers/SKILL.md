---
name: using-symfony-superpowers
description: Entry point for Symfony Superpowers - lightweight workflow guidance and command map
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Using Symfony Superpowers (Symfony)

## Use when
- Opening a session on a Symfony project, before choosing a skill.
- A task is stated in general terms and must be mapped to the right skill or command.
- Several skills could apply and you need to pick the one that fits.
- You need the command map or the runtime context of the library.

## Default workflow
1. Run the library's runtime context CLI first to get the Symfony version, API Platform, Docker setup and test framework.
2. Classify the task: design (`brainstorming`, `writing-plans`), build (`api-platform-*`, `doctrine-*`, `symfony-messenger`), test (`tdd-with-*`, `functional-tests`), secure (`symfony-voters`, `rate-limiting`), or ship (`quality-checks`).
3. Open the matching `SKILL.md` and follow it; use the command alias (for example `symfony-check`) when one exists.
4. Chain skills in order for large work: `brainstorming`, `writing-plans`, then `executing-plans`.
5. Re-check the context when the environment changes, such as containers started or a new dependency added.

## Guardrails
- Load one skill per concern instead of reading the whole catalog.
- Do not start coding before the matching skill is opened.
- Trust the detected versions over assumptions about Symfony or API Platform.
- If nothing matches, say so and continue with the project's own conventions.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- The context summary (versions, runner, test framework).
- The skill or command chosen for the task, with the reason.
- The ordered list of skills to apply when the work needs several.

## References
