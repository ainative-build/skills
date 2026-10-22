'use strict';
// The payload every hook runtime runs from: ~/.aif/hooks, plus the rules and
// plan scripts config.cjs finds beside it (<hooks>/../rules and
// <hooks>/../skills/engineering/aif-plan/scripts).
const fs = require('fs');
const path = require('path');
const { repoRoot } = require('./common.cjs');

// Plugin-only wiring; a shared install has no marker, so AIF_RUNTIME or the
// adapter names the runtime.
const SKIP = new Set(['hooks.json', '.runtime.json']);
const PLAN_SCRIPTS = ['lib.cjs', 'plan.cjs', 'prefs.cjs'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full) : [full];
  });
}

function render({ aifHome, root = repoRoot }) {
  const targets = [];
  const add = (src, dest) => targets.push({ path: dest, owner: 'shared', kind: 'file', content: fs.readFileSync(src, 'utf8') });
  const hooksSrc = path.join(root, 'hooks');
  for (const file of walk(hooksSrc)) {
    if (SKIP.has(path.basename(file))) continue;
    add(file, path.join(aifHome, 'hooks', path.relative(hooksSrc, file)));
  }
  for (const file of fs.readdirSync(path.join(root, 'rules')).filter((f) => f.endsWith('.md')).sort()) {
    add(path.join(root, 'rules', file), path.join(aifHome, 'rules', file));
  }
  const planSrc = path.join(root, 'skills', 'engineering', 'aif-plan', 'scripts');
  for (const file of PLAN_SCRIPTS) {
    add(path.join(planSrc, file), path.join(aifHome, 'skills', 'engineering', 'aif-plan', 'scripts', file));
  }
  return targets;
}

module.exports = { render };
