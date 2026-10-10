#!/usr/bin/env node
'use strict';
/** Ban raw `font-size: Npx` in paper/ and ui/ (DESIGN.md scale starts at xs = 12). */
const fs = require('node:fs');
const path = require('node:path');

const roots = [
  path.resolve(__dirname, '../src/renderer/src/paper'),
  path.resolve(__dirname, '../src/renderer/src/ui')
];
const skip = /screens\/(tasks|automations|memory)\//;
const hit = /font-size:\s*\d+px/;
const bad = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(css|tsx|ts)$/.test(name) && !skip.test(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (hit.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
  }
}
roots.forEach(walk);
if (bad.length) {
  console.error('Raw px font-size (use var(--paper-text-*)):\n' + bad.join('\n'));
  process.exit(1);
}
console.log('paper/ui font-size: no raw px');
