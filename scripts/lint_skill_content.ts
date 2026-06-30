#!/usr/bin/env npx tsx

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');
const requiredSections = ['## Use when', '## Default workflow', '## Guardrails', '## Output contract', '## References'];

let failed = false;

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
}

if (failed) {
  console.error('\nSkill content lint failed.');
  process.exit(1);
}

console.log('Skill content lint passed.');
