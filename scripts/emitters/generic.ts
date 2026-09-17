/** The installation matrix, and the fallback for anything not listed. */
import type { Emitter, EmittedFile } from './types.ts';
import { mdHeader } from './types.ts';
import type { Pivot } from '../pivot.ts';

export interface HarnessDoc {
  label: string;
  mechanism: string;
  install: string[];
  note?: string;
}

export function harnessDocs(p: Pivot): HarnessDoc[] {
  return [
    {
      label: 'Claude Code',
      mechanism: 'plugin marketplace',
      install: [
        `/plugin marketplace add dev-toolings/superpowers-symfony`,
        `/plugin install superpowers-symfony@superpowers-symfony`,
      ],
      note: 'Reads content/ directly through the component paths in `.claude-plugin/plugin.json`. Nothing is generated for it.',
    },
    {
      label: 'Codex CLI',
      mechanism: 'AGENTS.md + prompts',
      install: [`cp AGENTS.md /path/to/your/project/`, `cp dist/codex/prompts/*.md ~/.codex/prompts/`],
    },
    {
      label: 'Grok Build',
      mechanism: 'AGENTS.md + .agents/',
      install: [
        `cp AGENTS.md /path/to/your/project/`,
        `mkdir -p .agents && ln -s "$PWD/content/skills" .agents/skills`,
        `cp -R dist/agents/commands .agents/commands`,
      ],
      note:
        'Grok Build scans `.agents/skills/` and `.agents/commands/` from the cwd up to the repo root, ' +
        'so the skills need no conversion. It follows a symlink, so one link covers all 44.\n\n' +
        '**Trust the folder first.** Grok loads no project instructions and no project skills until the ' +
        'directory is trusted — `grok inspect` reports `Project trusted: no` and silently lists neither ' +
        'your AGENTS.md nor your skills. Run `grok` once in the project and accept the trust prompt, then ' +
        'verify with `grok inspect`.',
    },
    {
      label: 'OpenCode',
      mechanism: 'native skills + agents',
      install: [
        `mkdir -p .opencode && ln -s "$PWD/content/skills" .opencode/skills`,
        `cp -R dist/opencode/agent .opencode/agent`,
      ],
      note: 'OpenCode reads the SKILL.md layout as-is; only the agents are translated.',
    },
    {
      label: 'Cursor',
      mechanism: 'rules',
      install: [`mkdir -p .cursor/rules && cp dist/cursor/rules/*.mdc .cursor/rules/`],
    },
    {
      label: 'Windsurf',
      mechanism: 'rules',
      install: [`mkdir -p .windsurf/rules && cp dist/windsurf/rules/*.md .windsurf/rules/`],
    },
    {
      label: 'GitHub Copilot',
      mechanism: 'instructions + custom agents',
      install: [
        `mkdir -p .github && cp dist/copilot/copilot-instructions.md .github/`,
        `mkdir -p .github/instructions && cp dist/copilot/instructions/*.md .github/instructions/`,
        `mkdir -p .github/agents && cp dist/copilot/agents/*.agent.md .github/agents/`,
      ],
      note: 'Prompt files are deprecated for the Agent Host and are deliberately not generated.',
    },
    {
      label: 'Gemini CLI',
      mechanism: 'GEMINI.md + commands',
      install: [
        `cp dist/gemini/GEMINI.md /path/to/your/project/`,
        `mkdir -p ~/.gemini/commands && cp -R dist/gemini/commands/${p.namespace} ~/.gemini/commands/`,
      ],
    },
    {
      label: 'aider',
      mechanism: 'conventions',
      install: [`cp dist/aider/CONVENTIONS.md AGENTS.md /path/to/your/project/`, `cp dist/aider/.aider.conf.yml /path/to/your/project/`],
    },
    {
      label: 'Anything else',
      mechanism: 'manual',
      install: [`cp AGENTS.md /path/to/your/project/`],
      note: 'Point the agent at AGENTS.md; it routes to the right `content/skills/<name>/SKILL.md`.',
    },
  ];
}

export const generic: Emitter = {
  id: 'generic',
  label: 'Installation matrix (dist/README.md, dist/generic/INSTALL.md)',
  emit(p: Pivot): EmittedFile[] {
    const docs = harnessDocs(p);
    const table =
      `| Harness | Mechanism | Where it goes |\n| --- | --- | --- |\n` +
      docs.map((d) => `| ${d.label} | ${d.mechanism} | ${d.install[0].split(' ').pop()} |`).join('\n');

    const sections = docs
      .map((d) => {
        const note = d.note ? `\n${d.note}\n` : '';
        return `### ${d.label}\n\n\`\`\`bash\n${d.install.join('\n')}\n\`\`\`\n${note}`;
      })
      .join('\n');

    const body =
      `# Installing the Symfony skill library\n\n` +
      `Everything under \`dist/\` is generated from \`content/\` by \`bun run build\`.\n` +
      `Never edit it: run the build and commit the result instead.\n\n` +
      `${table}\n\n${sections}\n` +
      `## Using it by hand\n\n` +
      `The library is plain Markdown. Open \`AGENTS.md\`, find the skill that matches\n` +
      `the task, and read \`content/skills/<name>/SKILL.md\`. No tooling required.\n`;

    return [
      { path: 'dist/README.md', contents: mdHeader() + body, kind: 'full' },
      { path: 'dist/generic/INSTALL.md', contents: mdHeader() + body, kind: 'full' },
    ];
  },
};
