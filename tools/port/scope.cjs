'use strict';
// Shared helpers for the AgentKit → aif port scripts.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function loadScope() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'scope.json'), 'utf8'));
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

// Alternation of names, longest first so `web-testing` wins over `test`.
function alt(names) {
  return [...names]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
    else args[key] = true;
  }
  return args;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

module.exports = { repoRoot, loadScope, walk, isBinary, alt, parseArgs, lineOf };
