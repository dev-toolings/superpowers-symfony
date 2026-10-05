#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'content', 'skills');
const requiredSections = ['## Use when', '## Default workflow', '## Guardrails', '## Output contract', '## References'];

/**
 * Skills that still share a templated body with others (#17). A shared body
 * among these only warns; a duplicate involving any other skill fails, so a
 * new skill copied from a template cannot slip in. Remove ids as their body
 * is rewritten, and drop the set once it is empty.
 */
const KNOWN_SHARED = new Set([
  'api-platform-dto-resources', 'api-platform-filters', 'api-platform-resources', 'api-platform-security',
  'api-platform-serialization', 'api-platform-state-providers', 'api-platform-tests', 'api-platform-versioning',
  'e2e-panther-playwright', 'functional-tests', 'tdd-with-pest', 'tdd-with-phpunit', 'test-doubles-mocking',
  'messenger-retry-failures', 'symfony-messenger', 'symfony-scheduler',
  'doctrine-fetch-modes', 'doctrine-migrations', 'doctrine-relations',
  'brainstorming', 'runner-selection', 'using-symfony-superpowers',
]);

let failed = false;
const byBody = new Map<string, string[]>();

for (const entry of fs.readdirSync(SKILLS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(SKILLS, entry.name, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      console.error(`[missing-section] ${entry.name}: ${section}`);
      failed = true;
    }
  }

  const desc = (content.match(/\ndescription:\s*(.+)\n/) || [])[1] || '';
  if (desc.length < 40) {
    console.error(`[weak-description] ${entry.name}: description too short`);
    failed = true;
  }
  if (/Use when .*\b(skill|symfony)\b/i.test(desc)) {
    console.error(`[weak-description] ${entry.name}: generic description`);
    failed = true;
  }

  // "Use when" and "Default workflow" decide when a skill is offered, so two
  // skills sharing them are indistinguishable.
  const body = (content.match(/## Use when\n[\s\S]*?(?=## Guardrails)/) || [])[0];
  if (body) byBody.set(body, [...(byBody.get(body) ?? []), entry.name]);
}

for (const ids of byBody.values()) {
  if (ids.length < 2) continue;
  if (ids.every((id) => KNOWN_SHARED.has(id))) {
    console.warn(`[shared-body] ${ids.join(', ')}: same Use when / Default workflow (known, #17)`);
  } else {
    console.error(`[duplicate-body] ${ids.join(', ')}: same Use when / Default workflow`);
    failed = true;
  }
}

if (failed) {
  console.error('\nSkill content lint failed.');
  process.exit(1);
}

console.log('Skill content lint passed.');
