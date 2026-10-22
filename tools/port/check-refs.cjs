#!/usr/bin/env node
'use strict';
// Reference gate: fails on any leftover AgentKit reference or any aif-* name that does not
// resolve to a skill or agent shipped in this repo.
//
// Usage: node tools/port/check-refs.cjs [--only skill1,skill2] [--planned] [--json]
//   --planned also accepts names listed in scope.json that later phases will ship, for per-phase gating.
//   The release gate runs without it.
const fs = require('fs');
const path = require('path');
const { repoRoot, loadScope, walk, isBinary, parseArgs, lineOf } = require('./scope.cjs');

function shippedNames(scope, planned) {
  const names = new Set(scope.allowedAifNames);
  if (planned) for (const n of [...scope.skills, ...scope.agents]) names.add(n);
  const prefix = `${scope.targetPrefix}-`;
  for (const f of walk(path.join(repoRoot, 'skills'))) {
    const dir = path.basename(path.dirname(f));
    if (path.basename(f) === 'SKILL.md' && dir.startsWith(prefix)) names.add(dir.slice(prefix.length));
  }
  const agentsDir = path.join(repoRoot, scope.agentsTargetDir);
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.startsWith(prefix) && f.endsWith('.md')) names.add(f.slice(prefix.length, -3));
    }
  }
  return names;
}

function scanRoots(scope, args) {
  if (!args.only) return scope.scanDirs.map((d) => path.join(repoRoot, d));
  return String(args.only).split(',').map((s) =>
    path.join(repoRoot, scope.skillsTargetDir, `${scope.targetPrefix}-${s.trim()}`));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scope = loadScope();
  const src = scope.sourcePrefix;
  const dst = scope.targetPrefix;
  const shipped = shippedNames(scope, !!args.planned);
  const checks = [
    ['ak-reference', new RegExp(`(?:^|[^\\w])${src}[-:][a-z]`, 'g'), () => true],
    ['ak-cli', new RegExp(`\`${src} |(?:^|[^\\w-])${src} (?:plan|journal|config|eval|test|vision|ship|run|skill|skills|kit|agents|init|update)\\b`, 'g'), () => true],
    // A preceding '-' or '#' means a slug or anchor (e.g. #running-via-the-aif-advisor-…), not a name.
    ['unresolved-aif-name', new RegExp(`(?:^|[^\\w#-])${dst}-([a-z0-9]+(?:-[a-z0-9]+)*)`, 'g'),
      (m) => !shipped.has(m[1])],
  ];

  const findings = [];
  for (const root of scanRoots(scope, args)) {
    if (!fs.existsSync(root)) {
      if (args.only) findings.push({ file: path.relative(repoRoot, root), line: 0, kind: 'missing', text: 'directory not found' });
      continue;
    }
    for (const f of walk(root)) {
      const buf = fs.readFileSync(f);
      if (isBinary(buf)) continue;
      const text = buf.toString('utf8');
      const rel = path.relative(repoRoot, f);
      for (const [kind, re, isFinding] of checks) {
        for (const m of text.matchAll(re)) {
          if (!isFinding(m)) continue;
          const line = lineOf(text, m.index + (/^[^\w`]/.test(m[0]) ? 1 : 0));
          findings.push({ file: rel, line, kind, text: text.split('\n')[line - 1].trim().slice(0, 160) });
        }
      }
    }
  }

  if (args.json) process.stdout.write(JSON.stringify({ ok: findings.length === 0, findings }, null, 2) + '\n');
  else if (findings.length === 0) console.log('check-refs: ok');
  else {
    for (const f of findings) console.log(`${f.file}:${f.line} [${f.kind}] ${f.text}`);
    console.log(`check-refs: ${findings.length} finding(s)`);
  }
  process.exitCode = findings.length ? 1 : 0;
}

main();
