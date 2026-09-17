/**
 * Claude Code needs no generated tree: `.claude-plugin/plugin.json` points
 * straight at content/. What it does need is the harness-shaped frontmatter
 * keys, which this emitter projects back into the source files from the
 * neutral ones. Edit `capabilities` / `x-claude-code`, never the projections.
 */
import type { Emitter, EmittedFile } from './types.ts';
import { toolsFor } from '../pivot.ts';
import type { Pivot } from '../pivot.ts';
import { relative } from 'node:path';

const CC_KEYS = ['model', 'effort', 'maxTurns', 'memory'] as const;

export const claudeCode: Emitter = {
  id: 'claude-code',
  label: 'Claude Code (in-place frontmatter projection)',
  emit(p: Pivot): EmittedFile[] {
    const out: EmittedFile[] = [];

    for (const s of p.skills) {
      out.push({
        path: relative(p.root, s.sourcePath),
        kind: 'frontmatter',
        keys: ['allowed-tools'],
        contents: JSON.stringify({ 'allowed-tools': toolsFor(s.capabilities) }),
      });
    }

    for (const a of p.agents) {
      const cc = (a.x['x-claude-code'] ?? {}) as Record<string, unknown>;
      const projected: Record<string, unknown> = { tools: toolsFor(a.capabilities) };
      for (const k of CC_KEYS) if (k in cc) projected[k] = cc[k];
      out.push({
        path: relative(p.root, a.sourcePath),
        kind: 'frontmatter',
        keys: ['tools', ...CC_KEYS],
        contents: JSON.stringify(projected),
      });
    }

    return out;
  },
};
