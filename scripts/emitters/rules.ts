/**
 * Cursor, Windsurf and Copilot all work the same way: glob-scoped rule files
 * that the agent loads when it touches matching paths. One file per tag group,
 * never one per skill — 44 skills would blow every budget. Each rule is a
 * router: it names the skills of its group and where to open them.
 */
import type { Emitter, EmittedFile } from './types.ts';
import { mdHeader, assertUnder } from './types.ts';
import type { Pivot, TagGroup } from '../pivot.ts';
import { skillsOfGroup, skillPath } from '../pivot.ts';
import { compactRouter, HOW_TO_USE } from './render.ts';

function groupRouter(p: Pivot, g: TagGroup): string {
  const lines = skillsOfGroup(p, g.key)
    .map((s) => `- **${s.id}** — ${s.description}\n  Open \`${skillPath(s)}\`.`)
    .join('\n');
  return `# ${g.label}\n\n${g.summary}\n\n${HOW_TO_USE}\n\n${lines}\n`;
}

function indexBody(p: Pivot, howToOpen: string): string {
  return [
    `# Symfony skill library`,
    ``,
    p.description,
    ``,
    `${p.skills.length} skills are available in this repository. ${howToOpen}`,
    ``,
    `Run \`./bin/symfony-context\` first to detect the Symfony version, Docker setup`,
    `and test runner before issuing any command.`,
    ``,
    compactRouter(p),
    ``,
    `Full index with descriptions: \`AGENTS.md\`. Each skill lives at`,
    `\`content/skills/<name>/SKILL.md\`, with deeper detail in \`reference.md\`.`,
    ``,
  ].join('\n');
}

export const cursor: Emitter = {
  id: 'cursor',
  label: 'Cursor (.cursor/rules/*.mdc)',
  emit(p: Pivot): EmittedFile[] {
    const files: EmittedFile[] = [
      {
        path: 'dist/cursor/rules/symfony-index.mdc',
        kind: 'full',
        contents:
          `---\ndescription: Symfony skill library index — which skill to open for which task\nglobs: []\nalwaysApply: true\n---\n\n` +
          mdHeader() +
          indexBody(p, 'Open the one that matches the task before writing code.'),
      },
    ];

    for (const g of p.tagGroups) {
      if (!g.globs.length) continue; // workflow group has no file scope; the index covers it
      files.push({
        path: `dist/cursor/rules/symfony-${g.key}.mdc`,
        kind: 'full',
        contents:
          `---\ndescription: ${g.summary}\nglobs: ${JSON.stringify(g.globs)}\nalwaysApply: false\n---\n\n` +
          mdHeader() +
          groupRouter(p, g),
      });
    }
    return files;
  },
};

/** Windsurf caps workspace rules at 12 000 characters per file. */
const WINDSURF_BUDGET = 11_000;

export const windsurf: Emitter = {
  id: 'windsurf',
  label: 'Windsurf (.windsurf/rules/*.md)',
  emit(p: Pivot): EmittedFile[] {
    const files: EmittedFile[] = [
      {
        path: 'dist/windsurf/rules/symfony-index.md',
        kind: 'full',
        contents:
          `---\ntrigger: always_on\ndescription: Symfony skill library index — which skill to open for which task\n---\n\n` +
          mdHeader() +
          indexBody(p, 'Open the one that matches the task before writing code.'),
      },
    ];

    for (const g of p.tagGroups) {
      if (!g.globs.length) continue;
      files.push({
        path: `dist/windsurf/rules/symfony-${g.key}.md`,
        kind: 'full',
        contents:
          `---\ntrigger: glob\nglobs: ${g.globs.join(',')}\ndescription: ${g.summary}\n---\n\n` +
          mdHeader() +
          groupRouter(p, g),
      });
    }

    for (const f of files) assertUnder(f, WINDSURF_BUDGET, 'Windsurf workspace rule');
    return files;
  },
};

export const copilot: Emitter = {
  id: 'copilot',
  label: 'GitHub Copilot (.github/copilot-instructions.md + instructions + agents)',
  emit(p: Pivot): EmittedFile[] {
    const files: EmittedFile[] = [
      {
        path: 'dist/copilot/copilot-instructions.md',
        kind: 'full',
        contents: mdHeader() + indexBody(p, 'Open the one that matches the task before writing code.'),
      },
    ];

    for (const g of p.tagGroups) {
      if (!g.globs.length) continue;
      files.push({
        path: `dist/copilot/instructions/symfony-${g.key}.instructions.md`,
        kind: 'full',
        contents:
          `---\napplyTo: "${g.globs.join(',')}"\ndescription: ${g.summary}\n---\n\n` +
          mdHeader() +
          groupRouter(p, g),
      });
    }

    // Custom Agents (formerly chat modes). Prompt files are deprecated for the
    // Agent Host and are deliberately not emitted.
    for (const a of p.agents) {
      const preload = a.skills.map((id) => `- \`content/skills/${id}/SKILL.md\``).join('\n');
      files.push({
        path: `dist/copilot/agents/${a.id}.agent.md`,
        kind: 'full',
        contents:
          `---\nname: ${a.id}\ndescription: ${a.description}\n---\n\n` +
          mdHeader() +
          `${a.body}\n\n## Skills to consult\n\n${preload}\n`,
      });
    }

    return files;
  },
};
