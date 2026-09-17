/** Shared renderers: every harness gets the same router, in its own dialect. */
import type { Pivot, PivotSkill } from '../pivot.ts';
import { skillPath, referencePath, skillsOfGroup } from '../pivot.ts';

export function skillLine(s: PivotSkill): string {
  const ref = s.hasReference ? ` · [reference](${referencePath(s)})` : '';
  return `- **${s.id}** — ${s.description} → \`${skillPath(s)}\`${ref}`;
}

export function groupSection(p: Pivot, key: string, heading = '###'): string {
  const g = p.tagGroups.find((x) => x.key === key)!;
  const skills = skillsOfGroup(p, key);
  return `${heading} ${g.label}\n\n${skills.map(skillLine).join('\n')}\n`;
}

/** The full router: every skill, grouped, with its path. ~6 KB. */
export function routerBody(p: Pivot, heading = '###'): string {
  return p.tagGroups.map((g) => groupSection(p, g.key, heading)).join('\n');
}

/** A compact router: group labels and bare slugs only, for tight character budgets. */
export function compactRouter(p: Pivot): string {
  return p.tagGroups
    .map((g) => {
      const ids = skillsOfGroup(p, g.key).map((s) => s.id);
      return `- **${g.label}**: ${ids.join(', ')}`;
    })
    .join('\n');
}

export const HOW_TO_USE = [
  'Skills are instructions, not documentation. When a task matches one, open its',
  '`SKILL.md` and follow it literally — then open the sibling `reference.md` only',
  'if you need the deep implementation detail.',
].join('\n');

export function runtimeContext(): string {
  return [
    '## Runtime context',
    '',
    'Run `./bin/symfony-context` before the first command of a session. It detects',
    'the Symfony version, API Platform, the Docker setup, the test framework, and',
    'prints the correctly prefixed `console`, `composer` and test commands.',
    'Use `--format=markdown` for a readable block, `--format=env` for scripts.',
  ].join('\n');
}

export function versionNote(p: Pivot): string {
  return Object.entries(p.targets)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
}
