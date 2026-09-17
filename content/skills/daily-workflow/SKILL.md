---
name: daily-workflow
description: Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips
capabilities: [read, search]
tags: [workflow]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Daily Workflow (Symfony)

## Use when
- Refining architecture/workflows/context handling in Symfony projects.
- Planning and executing medium/complex changes safely.

## Default workflow
1. Establish current boundaries, constraints, and coupling points.
2. Propose smallest coherent architectural adjustment.
3. Execute in checkpoints with validation at each stage.
4. Summarize tradeoffs and follow-up backlog.

## Guardrails
- Use existing project patterns by default.
- Avoid broad refactors without explicit need.
- Keep decision log clear and auditable.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Architecture/workflow changes.
- Checkpoint validation outcomes.
- Residual risks and next steps.

## References
- `reference.md`
- `docs/complexity-tiers.md`
