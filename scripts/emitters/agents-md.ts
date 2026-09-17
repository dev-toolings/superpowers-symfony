/**
 * AGENTS.md — the neutral, cross-tool index (Agentic AI Foundation standard,
 * read by Codex CLI, Grok Build, aider, Copilot and others). Plus the flat
 * `.agents/commands/` layout that Grok Build and OpenCode pick up directly.
 */
import type { Emitter, EmittedFile } from './types.ts';
import { mdHeader } from './types.ts';
import type { Pivot } from '../pivot.ts';
import { routerBody, HOW_TO_USE, runtimeContext, versionNote } from './render.ts';
import { skillPath } from '../pivot.ts';

export function agentsIndex(p: Pivot): string {
  const agents = p.agents
    .map((a) => `- **${a.id}** (${a.mode}) — ${a.description}`)
    .join('\n');
  const commands = p.commands
    .map((c) => `- **${c.id}** — ${c.description} → skill \`${c.skill}\``)
    .join('\n');

  return [
    `# Symfony agent skill library`,
    ``,
    p.description,
    ``,
    `Version ${p.version} · ${p.repo}`,
    ``,
    `## Target versions`,
    ``,
    versionNote(p),
    ``,
    `## How to use this library`,
    ``,
    HOW_TO_USE,
    ``,
    `Paths below are relative to the root of this repository.`,
    ``,
    runtimeContext(),
    ``,
    `## Skills (${p.skills.length})`,
    ``,
    routerBody(p),
    `## Agents (${p.agents.length})`,
    ``,
    `Role prompts for delegated or focused work. Each one lives in`,
    `\`content/agents/<name>.md\`; open it and adopt it as your operating brief.`,
    ``,
    agents,
    ``,
    `## Commands (${p.commands.length})`,
    ``,
    `Named entry points; each is an alias for one skill.`,
    ``,
    commands,
    ``,
  ].join('\n');
}

export const agentsMd: Emitter = {
  id: 'agents-md',
  label: 'AGENTS.md + .agents/ layout (Codex CLI, Grok Build, generic)',
  emit(p: Pivot): EmittedFile[] {
    const files: EmittedFile[] = [
      { path: 'AGENTS.md', contents: mdHeader() + agentsIndex(p), kind: 'full' },
    ];

    for (const c of p.commands) {
      const s = p.skills.find((x) => x.id === c.skill)!;
      files.push({
        path: `dist/agents/commands/${c.id}.md`,
        kind: 'full',
        contents:
          mdHeader() +
          `# ${c.id}\n\n${c.description}\n\n` +
          `Open \`${skillPath(s)}\` and follow it exactly as written` +
          `${s.hasReference ? `, opening \`content/skills/${s.id}/reference.md\` for implementation detail` : ''}.\n`,
      });
    }

    files.push({
      path: 'dist/agents/README.md',
      kind: 'full',
      contents:
        mdHeader() +
        [
          `# The \`.agents/\` layout`,
          ``,
          `Grok Build and OpenCode both scan \`.agents/skills/\` and \`.agents/commands/\``,
          `from the working directory up to the repository root. Because the skills in`,
          `\`content/skills/\` already follow the open Agent Skills layout`,
          `(\`<name>/SKILL.md\` with \`name\` + \`description\`), they need no conversion —`,
          `only to be reachable at that path:`,
          ``,
          '```bash',
          `mkdir -p .agents`,
          `ln -s ../content/skills .agents/skills        # or: cp -R content/skills .agents/skills`,
          `cp -R dist/agents/commands .agents/commands`,
          '```',
          ``,
          `Then copy \`AGENTS.md\` to the root of the project you are working in.`,
          ``,
          `Grok Build gates project instructions and project skills behind folder`,
          `trust: until you accept the trust prompt, \`grok inspect\` reports`,
          `\`Project trusted: no\` and lists none of this. Run \`grok\` once in the`,
          `project, accept, then check with \`grok inspect\`.`,
          ``,
        ].join('\n'),
    });

    return files;
  },
};
