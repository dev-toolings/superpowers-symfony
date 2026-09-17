/**
 * The repository's own indexes. They used to be maintained by hand, which is
 * exactly why skills-map-lite.md had drifted; now they are derived.
 */
import type { Emitter, EmittedFile } from './types.ts';
import { mdHeader } from './types.ts';
import type { Pivot } from '../pivot.ts';
import { skillPath, skillsOfGroup } from '../pivot.ts';

export const indexes: Emitter = {
  id: 'indexes',
  label: 'Repository indexes (skills-map, README tables)',
  emit(p: Pivot): EmittedFile[] {
    const rows = p.skills
      .map((s) => `| \`${s.id}\` | ${s.description} | ${s.tags.join(', ')} | \`${skillPath(s)}\` |`)
      .join('\n');

    const map =
      mdHeader() +
      `# superpowers-symfony skills map\n\n` +
      `Short index for skill discovery without loading full files.\n\n` +
      `| Skill | Description | Tags | Path |\n| --- | --- | --- | --- |\n${rows}\n`;

    const liteBody = p.tagGroups
      .map((g) => {
        const lines = skillsOfGroup(p, g.key)
          .map((s) => `- \`${s.id}\` — ${s.description}`)
          .join('\n');
        return `## ${g.label}\n\n${lines}\n`;
      })
      .join('\n');

    const lite =
      mdHeader() +
      `# superpowers-symfony skills map (lite)\n\n` +
      `Lightweight index for fast discovery, grouped by tag.\n\n${liteBody}`;

    const agentRows = p.agents
      .map((a) => `| \`${a.id}\` | ${a.mode} | ${a.description} |`)
      .join('\n');
    const commandRows = p.commands
      .map((c) => `| \`/${c.id}\` | ${c.description} | \`${c.skill}\` |`)
      .join('\n');
    const skillRows = p.tagGroups
      .map((g) => {
        const lines = skillsOfGroup(p, g.key)
          .map((s) => `| \`${s.id}\` | ${s.description} |`)
          .join('\n');
        return `#### ${g.label}\n\n| Skill | Description |\n| --- | --- |\n${lines}\n`;
      })
      .join('\n');

    return [
      { path: 'skills-map.md', contents: map, kind: 'full' },
      { path: 'skills-map-lite.md', contents: lite, kind: 'full' },
      {
        path: 'README.md',
        kind: 'region',
        region: 'agents',
        contents: `| Agent | Mode | Description |\n| --- | --- | --- |\n${agentRows}\n`,
      },
      {
        path: 'README.md',
        kind: 'region',
        region: 'commands',
        contents: `| Command | Description | Skill |\n| --- | --- | --- |\n${commandRows}\n`,
      },
      { path: 'README.md', kind: 'region', region: 'skills', contents: skillRows },
    ];
  },
};
