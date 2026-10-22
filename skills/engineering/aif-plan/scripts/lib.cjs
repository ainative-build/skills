'use strict';
// Shared helpers for plan.cjs: argument parsing, frontmatter, git, local state.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Flags that never take a value, so `--stdin "Title"` keeps "Title" positional.
const BOOLEAN_FLAGS = new Set(['json', 'stdin', 'all', 'apply', 'clear', 'user', 'force']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq > 0) { args[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!BOOLEAN_FLAGS.has(key) && next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
    else args[key] = true;
  }
  return args;
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

// ---- frontmatter (the YAML subset plan files use: top-level scalars and inline lists)

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function parseScalar(raw) {
  let v = raw.trim();
  const dq = v.match(/^"((?:[^"\\]|\\.)*)"/);
  if (dq) { try { return JSON.parse(`"${dq[1]}"`); } catch { return dq[1]; } }
  const sq = v.match(/^'((?:[^']|'')*)'/);
  if (sq) return sq[1].replace(/''/g, "'");
  v = v.replace(/\s+#.*$/, '');
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => parseScalar(s)) : [];
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return v === '' ? '' : null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseFrontmatter(text) {
  const m = text.match(FM_RE);
  if (!m) return { data: null, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):(?:[ \t]+(.*))?$/);
    if (kv) data[kv[1]] = parseScalar(kv[2] || '');
  }
  return { data, body: text.slice(m[0].length) };
}

function formatScalar(v) {
  if (Array.isArray(v)) return `[${v.map(formatScalar).join(', ')}]`;
  if (v === null || v === undefined) return 'null';
  if (typeof v !== 'string') return String(v);
  const plain = /^[A-Za-z0-9_./@+-][A-Za-z0-9_ ./@+-]*$/.test(v) && !/ $/.test(v) &&
    !['true', 'false', 'null', '~'].includes(v) && !/^-?\d+(\.\d+)?$/.test(v);
  return plain ? v : JSON.stringify(v);
}

// Replace one top-level key in place (keeping any trailing comment), or append it.
function setFrontmatterField(text, key, value) {
  const m = text.match(FM_RE);
  if (!m) throw new Error('file has no frontmatter');
  const lines = m[1].split(/\r?\n/);
  const lineRe = new RegExp(`^${key}:[ \\t]*("(?:[^"\\\\]|\\\\.)*"|'(?:[^']|'')*'|[^#\\n]*?)([ \\t]+#.*)?$`);
  const idx = lines.findIndex((l) => lineRe.test(l));
  const rendered = `${key}: ${formatScalar(value)}`;
  if (idx >= 0) {
    const comment = lines[idx].match(lineRe)[2] || '';
    lines[idx] = rendered + comment;
  } else {
    lines.push(rendered);
  }
  return `---\n${lines.join('\n')}\n---\n` + text.slice(m[0].length);
}

// ---- local state (lifecycle, current-plan pointers, GitHub provenance); never inside the repo

function statePath() {
  return path.join(os.homedir(), '.aif', 'plans-state.json');
}

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    return { version: 1, plans: s.plans || {}, pointers: s.pointers || {} };
  } catch {
    return { version: 1, plans: {}, pointers: {} };
  }
}

function saveState(state) {
  const file = statePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

// ---- misc

function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled';
}

function formatDate(d, fmt) {
  const pad = (n) => String(n).padStart(2, '0');
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('YY', String(d.getFullYear()).slice(-2))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()));
}

function isoDate(d = new Date()) {
  return formatDate(d, 'YYYY-MM-DD');
}

function runCli(name, main) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`${name}: ${e.message}\n`);
    process.exitCode = process.exitCode || 1;
  }
}

function output(json, obj, text) {
  process.stdout.write((json ? JSON.stringify(obj, null, 2) : text) + '\n');
}

module.exports = {
  parseArgs, git, parseFrontmatter, setFrontmatterField, formatScalar, loadState, saveState, statePath,
  slugify, formatDate, isoDate, runCli, output,
};
