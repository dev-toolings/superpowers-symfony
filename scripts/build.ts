#!/usr/bin/env bun
/**
 * Generates every harness adapter from content/.
 *
 *   bun run build                     write everything
 *   bun run check                     write nothing; exit 1 on drift
 *   bun run build --harness=cursor    restrict to one or more emitters
 *   bun run build --list              show emitters and their outputs
 *   bun run build --force             overwrite files lacking the @generated marker
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { loadPivot } from './pivot.ts';
import type { EmittedFile, Emitter } from './emitters/types.ts';
import { MARKER } from './emitters/types.ts';
import { claudeCode } from './emitters/claude-code.ts';
import { indexes } from './emitters/indexes.ts';
import { agentsMd } from './emitters/agents-md.ts';
import { cursor, windsurf, copilot } from './emitters/rules.ts';
import { codex, gemini, opencode, aider } from './emitters/prompts.ts';
import { generic } from './emitters/generic.ts';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const EMITTERS: Emitter[] = [claudeCode, indexes, agentsMd, cursor, windsurf, copilot, codex, gemini, opencode, aider, generic];

/** Only these roots may ever be written. Anything else is a bug, not a feature. */
const WRITE_ALLOWLIST = [/^dist\//, /^content\/(skills|agents|commands)\//, /^AGENTS\.md$/, /^skills-map(-lite)?\.md$/, /^README\.md$/];
const MANIFEST = 'dist/.build-manifest.json';

interface Args { check: boolean; force: boolean; list: boolean; harnesses: string[] }

function parseArgs(argv: string[]): Args {
  const a: Args = { check: false, force: false, list: false, harnesses: [] };
  for (const arg of argv) {
    if (arg === '--check') a.check = true;
    else if (arg === '--force') a.force = true;
    else if (arg === '--list') a.list = true;
    else if (arg.startsWith('--harness=')) a.harnesses = arg.slice(10).split(',').map((s) => s.trim()).filter(Boolean);
    else throw new Error(`unknown option: ${arg}`);
  }
  return a;
}

function isGenerated(text: string): boolean {
  // The marker sits after any YAML frontmatter, which can be long, so scan the
  // whole file rather than a fixed-size prefix.
  return text.includes(MARKER);
}

/** Rewrite only the listed frontmatter keys of a source file; never touch the body. */
function patchFrontmatter(current: string, keys: string[], values: Record<string, unknown>): string {
  const m = current.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error('missing frontmatter');
  const lines = m[1].split('\n');
  const kept: string[] = [];
  let i = 0;
  let commentBuffer: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const key = line.match(/^([A-Za-z0-9_-]+):/)?.[1];
    if (key && keys.includes(key)) {
      // drop the key, its block continuation, and the comment introducing it
      commentBuffer = [];
      i++;
      while (i < lines.length && /^\s+/.test(lines[i]) && lines[i].trim() !== '') i++;
      continue;
    }
    if (/^\s*#/.test(line)) { commentBuffer.push(line); i++; continue; }
    kept.push(...commentBuffer, line);
    commentBuffer = [];
    i++;
  }
  const projected = stringifyYaml(values, { lineWidth: 0 }).trimEnd();
  const fm = [...kept.filter((l, idx, arr) => !(l.trim() === '' && idx === arr.length - 1)),
              `# projected by \`bun run build\` — do not edit by hand`,
              projected].join('\n');
  return `---\n${fm}\n---\n` + current.slice(m[0].length);
}

function applyRegion(current: string, region: string, body: string): string {
  const begin = `<!-- BEGIN ${region} -->`;
  const end = `<!-- END ${region} -->`;
  const s = current.indexOf(begin);
  const e = current.indexOf(end);
  if (s === -1 || e === -1) return current; // region not present yet: nothing to do
  return current.slice(0, s + begin.length) + '\n' + body.trimEnd() + '\n' + current.slice(e);
}

function render(file: EmittedFile): string {
  const abs = join(ROOT, file.path);
  const kind = file.kind ?? 'full';
  if (kind === 'full') return file.contents;
  const current = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  if (kind === 'frontmatter') return patchFrontmatter(current, file.keys!, JSON.parse(file.contents));
  return applyRegion(current, file.region!, file.contents);
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const selected = args.harnesses.length ? EMITTERS.filter((e) => args.harnesses.includes(e.id)) : EMITTERS;
  if (args.harnesses.length && selected.length !== args.harnesses.length) {
    const known = EMITTERS.map((e) => e.id).join(', ');
    console.error(`unknown harness. Known emitters: ${known}`);
    return 2;
  }

  const pivot = loadPivot(ROOT);

  if (args.list) {
    for (const e of EMITTERS) {
      const paths = e.emit(pivot).map((f) => f.path);
      const shown = paths.length > 3 ? `${paths.slice(0, 3).join(', ')} … (${paths.length})` : paths.join(', ');
      console.log(`${e.id.padEnd(12)} ${e.label}\n             ${shown}`);
    }
    return 0;
  }

  const files: EmittedFile[] = [];
  for (const e of selected) files.push(...e.emit(pivot));

  for (const f of files) {
    if (!WRITE_ALLOWLIST.some((re) => re.test(f.path))) {
      console.error(`refusing to write outside the allowlist: ${f.path}`);
      return 2;
    }
  }

  const drifted: string[] = [];
  const written: string[] = [];
  const refused: string[] = [];

  for (const f of files) {
    const abs = join(ROOT, f.path);
    const next = render(f);
    const exists = existsSync(abs);
    const current = exists ? readFileSync(abs, 'utf8') : null;

    if ((f.kind ?? 'full') === 'full' && exists && !isGenerated(current!) && !args.force) {
      refused.push(f.path);
      continue;
    }
    if (current === next) continue;
    if (args.check) { drifted.push(f.path); continue; }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, next);
    written.push(f.path);
  }

  // Orphans: files previously generated under dist/ that no emitter claims now.
  const owned = new Set(files.map((f) => f.path));
  const orphans: string[] = [];
  if (!args.harnesses.length && existsSync(join(ROOT, 'dist'))) {
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) { walk(abs); continue; }
        const rel = relative(ROOT, abs);
        if (rel === MANIFEST || owned.has(rel)) continue;
        orphans.push(rel);
      }
    };
    walk(join(ROOT, 'dist'));
  }
  if (orphans.length && !args.check) {
    for (const o of orphans) rmSync(join(ROOT, o));
  }

  if (refused.length) {
    console.error(`refusing to overwrite hand-written files (no ${MARKER} marker):`);
    for (const r of refused) console.error(`  ${r}`);
    console.error(`Re-run with --force if that is really what you want.`);
    return 2;
  }

  if (args.check) {
    if (drifted.length || orphans.length) {
      console.error(`Generated files are out of date. Run \`bun run build\` and commit the result.\n`);
      for (const d of drifted) console.error(`  stale   ${d}`);
      for (const o of orphans) console.error(`  orphan  ${o}`);
      return 1;
    }
    console.log(`up to date — ${files.length} generated files match content/`);
    return 0;
  }

  if (!args.harnesses.length) {
    mkdirSync(join(ROOT, 'dist'), { recursive: true });
    writeFileSync(join(ROOT, MANIFEST), JSON.stringify({ version: pivot.version, files: [...owned].sort() }, null, 2) + '\n');
  }

  console.log(`built ${files.length} files from content/ (${written.length} changed, ${orphans.length} orphans removed)`);
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error(`build failed: ${(e as Error).message}`);
  process.exit(2);
}
