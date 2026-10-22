#!/usr/bin/env node
'use strict';
// Reference gate: fails on any aif-* name, or "the installed/engineer <name> skill" phrase,
// that does not resolve to a skill or agent shipped in this repo.
//
// Usage: node tools/check-refs.cjs [--json] [--root <dir>]
const fs = require('fs');
const path = require('path');

const rootArg = process.argv.indexOf('--root');
if (rootArg > -1 && !process.argv[rootArg + 1]) {
  console.error('check-refs: --root needs a directory');
  process.exit(2);
}
const repoRoot = rootArg > -1 ? path.resolve(process.argv[rootArg + 1]) : path.resolve(__dirname, '..');
const SCAN_DIRS = ['skills', 'agents', 'rules', 'hooks', 'commands'];
// aif-* words that are not skill or agent names.
const ALLOWED = new Set(['install', 'bak']);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function shippedNames() {
  const names = new Set(ALLOWED);
  for (const f of walk(path.join(repoRoot, 'skills'))) {
    const dir = path.basename(path.dirname(f));
    if (path.basename(f) === 'SKILL.md' && dir.startsWith('aif-')) names.add(dir.slice(4));
  }
  for (const f of fs.readdirSync(path.join(repoRoot, 'agents'))) {
    if (f.startsWith('aif-') && f.endsWith('.md')) names.add(f.slice(4, -3));
  }
  return names;
}

function main() {
  const json = process.argv.includes('--json');
  const shipped = shippedNames();
  // A preceding '-' or '#' means a slug or anchor (e.g. #running-via-the-aif-advisor-…), not a name.
  const re = /(?:^|[^\w#-])aif-([a-z0-9]+(?:-[a-z0-9]+)*)/g;
  // Generic phrasing such as "the installed project-organization skill" must also name a shipped skill.
  const phrase = /\bthe (?:installed|engineer) (?:aif-)?([a-z0-9]+(?:-[a-z0-9]+)*) skill\b/gi;
  const findings = [];
  for (const dir of SCAN_DIRS) {
    for (const f of walk(path.join(repoRoot, dir))) {
      const buf = fs.readFileSync(f);
      if (buf.subarray(0, 8000).includes(0)) continue;
      const text = buf.toString('utf8');
      const add = (m, name) => {
        const line = text.slice(0, m.index + 1).split('\n').length;
        findings.push({ file: path.relative(repoRoot, f), line, name, text: text.split('\n')[line - 1].trim().slice(0, 160) });
      };
      for (const m of text.matchAll(re)) {
        if (!shipped.has(m[1])) add(m, `aif-${m[1]}`);
      }
      for (const m of text.matchAll(phrase)) {
        if (!shipped.has(m[1].toLowerCase())) add(m, m[1]);
      }
    }
  }
  if (json) process.stdout.write(JSON.stringify({ ok: findings.length === 0, findings }, null, 2) + '\n');
  else if (findings.length === 0) console.log('check-refs: ok');
  else {
    for (const f of findings) console.log(`${f.file}:${f.line} [${f.name}] ${f.text}`);
    console.log(`check-refs: ${findings.length} finding(s)`);
  }
  process.exitCode = findings.length ? 1 : 0;
}

main();
