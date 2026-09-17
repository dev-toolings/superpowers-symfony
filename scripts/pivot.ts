/**
 * Loads the neutral pivot (content/) into a typed model.
 *
 * The pivot is the single source of truth. Every harness artifact is derived
 * from it, and every harness-shaped frontmatter key in the source files is a
 * projection written back by the build, never something you edit by hand.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';

export type Capability = 'read' | 'search' | 'edit' | 'shell' | 'web';

export const CAPABILITY_ORDER: Capability[] = ['read', 'search', 'edit', 'shell', 'web'];

/** capability -> Claude Code tool names. Single place where the mapping lives. */
export const CAPABILITY_TOOLS: Record<Capability, string[]> = {
  read: ['Read'],
  search: ['Glob', 'Grep'],
  edit: ['Write', 'Edit'],
  shell: ['Bash'],
  web: ['WebFetch', 'WebSearch'],
};

export type AgentMode = 'implement' | 'review' | 'analyze';

export interface TagGroup {
  key: string;
  label: string;
  summary: string;
  globs: string[];
}

export interface PivotSkill {
  id: string;
  description: string;
  capabilities: Capability[];
  tags: string[];
  globs: string[];
  body: string;
  hasReference: boolean;
  sourcePath: string;
  x: Record<string, unknown>;
}

export interface PivotAgent {
  id: string;
  description: string;
  mode: AgentMode;
  capabilities: Capability[];
  skills: string[];
  body: string;
  sourcePath: string;
  x: Record<string, unknown>;
}

export interface PivotCommand {
  id: string;
  description: string;
  skill: string;
  sourcePath: string;
}

export interface Pivot {
  root: string;
  namespace: string;
  version: string;
  repo: string;
  description: string;
  targets: Record<string, string>;
  tagGroups: TagGroup[];
  extraTags: string[];
  skills: PivotSkill[];
  agents: PivotAgent[];
  commands: PivotCommand[];
}

export interface Frontmatter {
  data: Record<string, any>;
  body: string;
  raw: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(text: string, where: string): Frontmatter {
  const m = text.match(FM_RE);
  if (!m) throw new Error(`${where}: missing YAML frontmatter`);
  let data: Record<string, any>;
  try {
    data = parseYaml(m[1]) ?? {};
  } catch (e) {
    throw new Error(`${where}: invalid YAML frontmatter — ${(e as Error).message}`);
  }
  return { data, body: text.slice(m[0].length), raw: m[1] };
}

function xKeys(data: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (k.startsWith('x-')) out[k] = v;
  return out;
}

function asList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Expand capabilities into the Claude Code tool list, in a stable order. */
export function toolsFor(caps: Capability[]): string[] {
  const out: string[] = [];
  for (const c of CAPABILITY_ORDER) if (caps.includes(c)) out.push(...CAPABILITY_TOOLS[c]);
  return out;
}

export function loadPivot(root: string): Pivot {
  const manifestPath = join(root, 'content', 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`missing ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const tagGroups: TagGroup[] = Object.entries(manifest.tagGroups as Record<string, any>).map(
    ([key, g]) => ({ key, label: g.label, summary: g.summary, globs: g.globs ?? [] }),
  );
  const groupKeys = new Set(tagGroups.map((g) => g.key));

  const skillsDir = join(root, 'content', 'skills');
  const skills: PivotSkill[] = readdirSync(skillsDir)
    .filter((d) => statSync(join(skillsDir, d)).isDirectory())
    .sort()
    .map((dir) => {
      const sourcePath = join(skillsDir, dir, 'SKILL.md');
      const { data, body } = splitFrontmatter(readFileSync(sourcePath, 'utf8'), `content/skills/${dir}/SKILL.md`);
      const tags = asList(data.tags);
      const own = asList(data.globs);
      const inherited = tagGroups.filter((g) => tags.includes(g.key)).flatMap((g) => g.globs);
      return {
        id: dir,
        description: String(data.description ?? '').trim(),
        capabilities: asList(data.capabilities) as Capability[],
        tags,
        globs: own.length ? own : [...new Set(inherited)],
        body: body.trim(),
        hasReference: existsSync(join(skillsDir, dir, 'reference.md')),
        sourcePath,
        x: xKeys(data),
      };
    });

  const agentsDir = join(root, 'content', 'agents');
  const agents: PivotAgent[] = readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const sourcePath = join(agentsDir, file);
      const { data, body } = splitFrontmatter(readFileSync(sourcePath, 'utf8'), `content/agents/${file}`);
      return {
        id: basename(file, '.md'),
        description: String(data.description ?? '').replace(/\s+/g, ' ').trim(),
        mode: (data.mode ?? 'implement') as AgentMode,
        capabilities: asList(data.capabilities) as Capability[],
        skills: asList(data.skills),
        body: body.trim(),
        sourcePath,
        x: xKeys(data),
      };
    });

  const commandsDir = join(root, 'content', 'commands');
  const commands: PivotCommand[] = readdirSync(commandsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const sourcePath = join(commandsDir, file);
      const { data } = splitFrontmatter(readFileSync(sourcePath, 'utf8'), `content/commands/${file}`);
      return {
        id: basename(file, '.md'),
        description: String(data.description ?? '').trim(),
        skill: String(data.skill ?? '').trim(),
        sourcePath,
      };
    });

  return {
    root,
    namespace: manifest.namespace,
    version: manifest.version,
    repo: manifest.repo,
    description: manifest.description,
    targets: manifest.targets ?? {},
    tagGroups,
    extraTags: manifest.extraTags ?? [],
    skills,
    agents,
    commands,
  };
}

/** Skills that belong to a tag group, in stable order. */
export function skillsOfGroup(p: Pivot, key: string): PivotSkill[] {
  return p.skills.filter((s) => s.tags.includes(key));
}

/** Skill path relative to the repository root, for cross-references. */
export function skillPath(s: PivotSkill): string {
  return `content/skills/${s.id}/SKILL.md`;
}

export function referencePath(s: PivotSkill): string {
  return `content/skills/${s.id}/reference.md`;
}
