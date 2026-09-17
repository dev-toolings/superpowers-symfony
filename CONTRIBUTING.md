# Contributing

## The one rule

**`content/` is the source. Everything else is derived.**

Edit `content/`, run `bun run build`, commit the result. Never edit a file that
carries the `@generated` marker, and never edit a frontmatter key introduced by
the `# projected by \`bun run build\`` comment — the next build overwrites both,
and CI fails on the difference in the meantime.

```
content/          you edit this
   ↓  bun run build
AGENTS.md · skills-map*.md · dist/**    generated, committed, drift-checked
```

## Setup

```bash
bun install
bun run test      # drift check + pivot validation + content lint
```

There is no `npm` here: the project is built and tested with `bun`.

## Everyday loop

```bash
bun run build          # regenerate every adapter
bun run build --list   # see which emitter owns which output
bun run check          # what CI runs: fails if dist/ is stale
bun run validate       # pivot + artifacts + Claude Code packaging
bun run lint           # the five required sections, description quality
```

## Adding a skill

1. Create `content/skills/<name>/SKILL.md`. The directory name is the identifier:
   lowercase, hyphen-separated, no namespace prefix.

   ```yaml
   ---
   name: <name>                          # must equal the directory name
   description: One sentence, 40–1024 characters, saying when to reach for it
   capabilities: [read, search, edit, shell]
   tags: [doctrine]                      # at least one tag group from content/manifest.json
   ---
   ```

2. Write the body with the five required sections: `## Use when`,
   `## Default workflow`, `## Guardrails`, `## Output contract`, `## References`.
   Keep it short and imperative — it is an instruction sheet, not documentation.

3. Put the depth in a sibling `reference.md`. If the body mentions `reference.md`,
   the file must exist; validation enforces it.

4. `bun run build && bun run test`.

`allowed-tools` is written for you from `capabilities`. Do not add it by hand.

## Adding an agent

`content/agents/<name>.md`, with `mode` (`implement` / `review` / `analyze`),
`capabilities`, the `skills` it should preload, and an `x-claude-code` block for
the knobs only Claude Code understands (`model`, `effort`, `maxTurns`, `memory`).
The root-level `tools`, `model`, `effort`, `maxTurns` and `memory` keys are
projections — the build writes them.

## Adding a harness

One file in `scripts/emitters/`, exporting an `Emitter`:

```ts
export const myHarness: Emitter = {
  id: 'my-harness',
  label: 'My Harness (path/to/rules)',
  emit(pivot) {
    return [{ path: 'dist/my-harness/rules.md', contents: '…', kind: 'full' }];
  },
};
```

Register it in the `EMITTERS` array in `scripts/build.ts`. Rules of the road:

- Emit a **router**, not the 44 skills inlined. Name each skill, describe when it
  applies, and give the path to its `SKILL.md`. Only harnesses with no notion of
  a skill (Codex, Gemini) inline a body, and then only one skill per file.
- Every generated file must start with the `@generated` marker (use `mdHeader()`
  or `hashHeader()`), or `bun run validate` rejects it.
- If the harness has a size limit, assert it with `assertUnder()` so the 45th
  skill fails the build instead of being silently truncated.
- Write only under `dist/`; the build refuses anything else.

## Content rules

Skill bodies must stay vendor-neutral. `bun run validate` rejects any mention of
a specific harness or model in `SKILL.md` and `reference.md`. If a mention is
genuinely warranted, mark that line with `<!-- harness-ok -->`.

## Before opening a pull request

```bash
bun run test
```

CI runs the same three checks, plus a relative-link check and the
`bin/symfony-context` test matrix on Linux and macOS (including stock bash 3.2 —
do not introduce `mapfile` or other bash 4+ builtins into that script).
