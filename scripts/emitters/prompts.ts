/**
 * Harnesses with no notion of a skill: the skill body is inlined into a prompt
 * or command, because a bare "use the tdd-with-pest skill" would point at
 * nothing they can resolve.
 */
import type { Emitter, EmittedFile } from './types.ts';
import { mdHeader, hashHeader } from './types.ts';
import type { Pivot, PivotCommand, PivotSkill } from '../pivot.ts';
import { referencePath } from '../pivot.ts';
import { agentsIndex } from './agents-md.ts';

function pair(p: Pivot, c: PivotCommand): { c: PivotCommand; s: PivotSkill } {
  const s = p.skills.find((x) => x.id === c.skill);
  if (!s) throw new Error(`command ${c.id}: unknown skill "${c.skill}"`);
  return { c, s };
}

export const codex: Emitter = {
  id: 'codex',
  label: 'Codex CLI (~/.codex/prompts/*.md)',
  emit(p: Pivot): EmittedFile[] {
    return p.commands.map((cmd) => {
      const { c, s } = pair(p, cmd);
      const ref = s.hasReference
        ? `\nDeeper implementation detail: \`${referencePath(s)}\`.\n`
        : '';
      return {
        path: `dist/codex/prompts/${p.namespace}-${c.id.replace(/^symfony-/, '')}.md`,
        kind: 'full',
        contents: mdHeader() + `${c.description}\n\nFollow this skill exactly as written.\n\n${s.body}\n${ref}`,
      };
    });
  },
};

export const gemini: Emitter = {
  id: 'gemini',
  label: 'Gemini CLI (GEMINI.md + .gemini/commands/symfony/*.toml)',
  emit(p: Pivot): EmittedFile[] {
    const files: EmittedFile[] = [
      { path: 'dist/gemini/GEMINI.md', contents: mdHeader() + agentsIndex(p), kind: 'full' },
    ];

    for (const cmd of p.commands) {
      const { c, s } = pair(p, cmd);
      const prompt = `${c.description}\n\nFollow this skill exactly as written.\n\n${s.body}\n\nTarget: {{args}}\n`;
      if (prompt.includes('"""')) {
        throw new Error(`gemini: skill "${s.id}" contains a triple quote, which breaks TOML multi-line strings`);
      }
      files.push({
        path: `dist/gemini/commands/${p.namespace}/${c.id.replace(/^symfony-/, '')}.toml`,
        kind: 'full',
        contents:
          hashHeader() +
          `description = ${JSON.stringify(c.description)}\n` +
          `prompt = """\n${prompt}"""\n`,
      });
    }
    return files;
  },
};

export const opencode: Emitter = {
  id: 'opencode',
  label: 'OpenCode (.opencode/agent/*.md)',
  emit(p: Pivot): EmittedFile[] {
    // Skills need no conversion: OpenCode reads content/skills/ as-is once it is
    // reachable from .opencode/skills/ or .agents/skills/. Only agents are mapped.
    return p.agents.map((a) => {
      const tools: Record<string, boolean> = {};
      if (a.capabilities.includes('edit')) { tools.write = true; tools.edit = true; }
      else { tools.write = false; tools.edit = false; }
      tools.bash = a.capabilities.includes('shell');
      const preload = a.skills.map((id) => `- \`content/skills/${id}/SKILL.md\``).join('\n');
      const yamlTools = Object.entries(tools).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      return {
        path: `dist/opencode/agent/${a.id}.md`,
        kind: 'full',
        contents:
          `---\ndescription: ${a.description}\nmode: subagent\ntools:\n${yamlTools}\n---\n\n` +
          mdHeader() +
          `${a.body}\n\n## Skills to consult\n\n${preload}\n`,
      };
    });
  },
};

export const aider: Emitter = {
  id: 'aider',
  label: 'aider (CONVENTIONS.md + .aider.conf.yml)',
  emit(p: Pivot): EmittedFile[] {
    return [
      { path: 'dist/aider/CONVENTIONS.md', contents: mdHeader() + agentsIndex(p), kind: 'full' },
      {
        path: 'dist/aider/.aider.conf.yml',
        kind: 'full',
        contents: hashHeader() + `read:\n  - CONVENTIONS.md\n  - AGENTS.md\n`,
      },
    ];
  },
};
