#!/usr/bin/env bun
/**
 * Validates the pivot first, the generated artifacts second, and the Claude Code
 * packaging last — the packaging being optional, because a harness-agnostic
 * library must be able to validate without any vendor manifest present.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadPivot, CAPABILITY_ORDER, splitFrontmatter } from './pivot.ts';
import type { Pivot } from './pivot.ts';
import { MARKER } from './emitters/types.ts';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

interface Diagnostic { file: string; message: string; level: 'error' | 'warning' }
const diags: Diagnostic[] = [];
const err = (file: string, message: string) => diags.push({ file, message, level: 'error' });
const warn = (file: string, message: string) => diags.push({ file, message, level: 'warning' });

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED_SECTIONS = ['## Use when', '## Default workflow', '## Guardrails', '## Output contract', '## References'];

/**
 * Terms that tie the content to one vendor. This is the guard that keeps the
 * library portable as it grows: it would have caught the two "Claude" mentions
 * that had drifted into effective-context. Escape a legitimate one with an
 * `<!-- harness-ok -->` comment on the same line.
 */
const HARNESS_TERMS = /\b(claude|anthropic|cursor|copilot|windsurf|codex|gemini|todowrite|subagent)\b/i;

function checkHarnessLeak(file: string, text: string): void {
  text.split('\n').forEach((line, i) => {
    if (line.includes('<!-- harness-ok -->')) return;
    const m = line.match(HARNESS_TERMS);
    if (m) err(`${file}:${i + 1}`, `harness-specific term "${m[0]}" in portable content`);
  });
}

function validatePivot(p: Pivot): void {
  const groupKeys = new Set(p.tagGroups.map((g) => g.key));
  const allTags = new Set([...groupKeys, ...p.extraTags]);
  const skillIds = new Set(p.skills.map((s) => s.id));

  for (const s of p.skills) {
    const f = `content/skills/${s.id}/SKILL.md`;
    if (!ID_RE.test(s.id)) err(f, `directory name "${s.id}" must match ${ID_RE}`);
    if (s.id.length > 64) err(f, `name longer than 64 characters`);

    const { data } = splitFrontmatter(readFileSync(s.sourcePath, 'utf8'), f);
    if (data.name !== s.id) err(f, `name "${data.name}" must equal the directory name "${s.id}"`);
    if (String(data.name ?? '').includes(':')) err(f, `name must not be namespaced; the namespace lives in content/manifest.json`);

    // An unquoted YAML scalar ends at " #", which silently truncated four
    // descriptions here for as long as a real YAML parser has read them.
    const rawDesc = readFileSync(s.sourcePath, 'utf8').match(/^description: (?!["'])(.*)$/m)?.[1];
    if (rawDesc && rawDesc.includes(' #')) {
      err(f, 'description contains " #" but is not quoted — YAML truncates it at the comment');
    }

    if (!s.description) err(f, 'missing description');
    else if (s.description.length < 40) err(f, `description is ${s.description.length} characters, want at least 40`);
    else if (s.description.length > 1024) err(f, `description is ${s.description.length} characters, over the 1024 limit`);

    if (!s.capabilities.length) err(f, 'missing capabilities');
    for (const c of s.capabilities) {
      if (!CAPABILITY_ORDER.includes(c)) err(f, `unknown capability "${c}" (want ${CAPABILITY_ORDER.join(', ')})`);
    }

    if (!s.tags.length) err(f, 'missing tags');
    for (const t of s.tags) if (!allTags.has(t)) err(f, `unknown tag "${t}" — add it to content/manifest.json`);
    if (!s.tags.some((t) => groupKeys.has(t))) {
      err(f, `no tag group: the skill would be absent from every Cursor/Windsurf/Copilot rule`);
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!s.body.includes(section)) err(f, `missing required section "${section}"`);
    }

    const refersToReference = /reference\.md/.test(s.body);
    if (refersToReference && !s.hasReference) err(f, 'body points at reference.md, which does not exist');

    checkHarnessLeak(f, s.body);
    const ref = join(ROOT, 'content', 'skills', s.id, 'reference.md');
    if (existsSync(ref)) checkHarnessLeak(`content/skills/${s.id}/reference.md`, readFileSync(ref, 'utf8'));

    for (const key of Object.keys(s.x)) {
      if (!/^x-(claude-code|opencode|cursor|windsurf|copilot|codex|gemini|aider|grok)$/.test(key)) {
        err(f, `unknown harness block "${key}" — likely a typo`);
      }
    }
  }

  for (const a of p.agents) {
    const f = `content/agents/${a.id}.md`;
    if (!ID_RE.test(a.id)) err(f, `file name "${a.id}" must match ${ID_RE}`);
    if (!a.description) err(f, 'missing description');
    if (!['implement', 'review', 'analyze'].includes(a.mode)) err(f, `unknown mode "${a.mode}"`);
    if (!a.capabilities.length) err(f, 'missing capabilities');
    for (const id of a.skills) {
      if (!skillIds.has(id)) err(f, `preloads unknown skill "${id}"`);
    }
    if (a.mode !== 'implement' && a.capabilities.includes('edit')) {
      warn(f, `mode "${a.mode}" but declares the edit capability`);
    }
  }

  for (const c of p.commands) {
    const f = `content/commands/${c.id}.md`;
    if (!c.description) err(f, 'missing description');
    if (!c.skill) err(f, 'missing skill: key');
    else if (!skillIds.has(c.skill)) err(f, `targets unknown skill "${c.skill}"`);
  }
}

function validateEmitted(): void {
  const dist = join(ROOT, 'dist');
  if (!existsSync(dist)) { warn('dist/', 'not built yet — run `bun run build`'); return; }

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const abs = join(dir, e);
      return statSync(abs).isDirectory() ? walk(abs) : [abs];
    });

  for (const abs of walk(dist)) {
    const rel = abs.slice(ROOT.length + 1);
    if (rel.endsWith('.build-manifest.json')) continue;
    const text = readFileSync(abs, 'utf8');
    if (!text.includes(MARKER)) err(rel, 'generated file is missing the @generated marker');
    if (rel.endsWith('.toml') && (text.match(/"""/g) ?? []).length % 2 !== 0) {
      err(rel, 'unbalanced TOML multi-line string delimiters');
    }
    if (rel.startsWith('dist/windsurf/rules/') && text.length > 12_000) {
      err(rel, `${text.length} characters exceeds the Windsurf 12000-character rule limit`);
    }
  }

  for (const f of ['AGENTS.md', 'skills-map.md', 'skills-map-lite.md']) {
    if (!existsSync(join(ROOT, f))) err(f, 'missing — run `bun run build`');
  }
}

function validateClaudeCode(p: Pivot): void {
  const manifest = join(ROOT, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifest)) { warn('.claude-plugin/plugin.json', 'absent (optional packaging)'); return; }
  const json = JSON.parse(readFileSync(manifest, 'utf8'));
  for (const field of ['name', 'description', 'version']) {
    if (!json[field]) err('.claude-plugin/plugin.json', `missing required field "${field}"`);
  }
  if (json.version !== p.version) {
    err('.claude-plugin/plugin.json', `version ${json.version} differs from content/manifest.json (${p.version})`);
  }
  for (const key of ['skills', 'agents', 'commands', 'hooks']) {
    const value = json[key];
    if (!value) continue;
    for (const rel of Array.isArray(value) ? value : [value]) {
      if (String(rel).includes('..')) err('.claude-plugin/plugin.json', `${key}: ".." is not allowed`);
      if (!existsSync(join(ROOT, String(rel)))) err('.claude-plugin/plugin.json', `${key}: "${rel}" does not exist`);
    }
  }

  const market = join(ROOT, '.claude-plugin', 'marketplace.json');
  if (existsSync(market)) {
    const m = JSON.parse(readFileSync(market, 'utf8'));
    if (m.metadata?.version !== p.version) err('.claude-plugin/marketplace.json', `metadata.version differs from content/manifest.json`);
    for (const plugin of m.plugins ?? []) {
      if (plugin.version !== p.version) err('.claude-plugin/marketplace.json', `plugins[].version differs from content/manifest.json`);
      const repo = plugin.source?.repo;
      if (repo && !String(p.repo).endsWith(repo)) {
        err('.claude-plugin/marketplace.json', `source.repo "${repo}" does not match content/manifest.json repo "${p.repo}"`);
      }
    }
  }

  for (const f of ['hooks/hooks.json', 'bin/symfony-context', 'hooks/session-start.sh']) {
    const abs = join(ROOT, f);
    if (!existsSync(abs)) { err(f, 'missing'); continue; }
    if (!f.endsWith('.json') && !(statSync(abs).mode & 0o111)) err(f, 'not executable');
  }
}

const pivot = loadPivot(ROOT);
validatePivot(pivot);
validateEmitted();
validateClaudeCode(pivot);

const errors = diags.filter((d) => d.level === 'error');
const warnings = diags.filter((d) => d.level === 'warning');
for (const d of warnings) console.warn(`warning  ${d.file}: ${d.message}`);
for (const d of errors) console.error(`error    ${d.file}: ${d.message}`);

console.log(
  `\n${pivot.skills.length} skills · ${pivot.agents.length} agents · ${pivot.commands.length} commands` +
    ` — ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length ? 1 : 0);
