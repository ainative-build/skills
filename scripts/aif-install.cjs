#!/usr/bin/env node
'use strict';
/**
 * aif-install: install the aif agents, rules and hooks into a runtime's user
 * config without the Claude Code plugin.
 *
 *   aif-install --runtime claude|codex|omp|cursor|all [--uninstall] [--dry-run] [--home <dir>] [--json]
 *
 * Every write is recorded in ~/.aif/install-manifest.json. Install computes
 * every file first and writes nothing if any existing config fails to parse.
 * A pre-existing file is backed up to <file>.aif-bak before its first change;
 * uninstall restores it byte for byte when nothing but aif's own edits changed
 * it, and otherwise removes only the aif parts and keeps the backup.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ParseError } = require('./render/merge.cjs');

const RENDERERS = {
  claude: require('./render/claude.cjs'),
  codex: require('./render/codex.cjs'),
  omp: require('./render/omp.cjs'),
  cursor: require('./render/cursor.cjs'),
  shared: require('./render/shared.cjs'),
};
const RUNTIMES = ['claude', 'codex', 'omp', 'cursor'];
const HOOK_RUNTIMES = new Set(['claude', 'codex', 'cursor']);
const BACKUP_SUFFIX = '.aif-bak';
const USAGE = 'usage: aif-install --runtime claude|codex|omp|cursor|all [--uninstall] [--dry-run] [--home <dir>] [--json]';

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { runtime: null, uninstall: false, dryRun: false, home: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i];
      if (!v) throw new UsageError(`${a} needs a value`);
      return v;
    };
    if (a === '--runtime' || a.startsWith('--runtime=')) args.runtime = value();
    else if (a === '--home' || a.startsWith('--home=')) args.home = value();
    else if (a === '--uninstall') args.uninstall = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else throw new UsageError(`unknown argument: ${a}`);
  }
  if (args.help) return args;
  if (!args.runtime) throw new UsageError('--runtime is required');
  if (args.runtime !== 'all' && !RUNTIMES.includes(args.runtime)) throw new UsageError(`unknown runtime: ${args.runtime}`);
  return args;
}

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const readOrNull = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
}

function context(home) {
  const aifHome = path.join(home, '.aif');
  const hooksDir = path.join(aifHome, 'hooks');
  return { home, aifHome, hooksDir, marker: hooksDir + path.sep, manifestPath: path.join(aifHome, 'install-manifest.json') };
}

function loadManifest(ctx) {
  const text = readOrNull(ctx.manifestPath);
  if (text === null) return { schemaVersion: 1, entries: {}, dirs: {} };
  let m;
  try {
    m = JSON.parse(text);
  } catch (error) {
    throw new ParseError(`cannot parse ${ctx.manifestPath} (${error.message})`);
  }
  if (m.schemaVersion !== 1) throw new ParseError(`${ctx.manifestPath}: unsupported schemaVersion ${m.schemaVersion}`);
  return { schemaVersion: 1, entries: m.entries || {}, dirs: m.dirs || {} };
}

function renderOwner(owner, ctx) {
  return RENDERERS[owner].render(ctx);
}

/** Directories between home (exclusive) and dir (inclusive) that do not exist yet. */
function missingDirs(ctx, dir) {
  const out = [];
  let d = dir;
  while (d !== ctx.home && d.startsWith(ctx.home + path.sep) && !fs.existsSync(d)) {
    out.unshift(d);
    d = path.dirname(d);
  }
  return out;
}

function ensureDir(ctx, manifest, dir, owner) {
  for (const d of missingDirs(ctx, dir)) {
    fs.mkdirSync(d);
    manifest.dirs[d] = owner;
  }
  fs.mkdirSync(dir, { recursive: true });
}

function removeEmptyDirs(manifest, owners) {
  const dirs = Object.keys(manifest.dirs).filter((d) => !owners || owners.has(manifest.dirs[d]));
  for (const d of dirs.sort((a, b) => b.length - a.length)) {
    try {
      if (!fs.existsSync(d)) delete manifest.dirs[d];
      else if (fs.readdirSync(d).length === 0) {
        fs.rmdirSync(d);
        delete manifest.dirs[d];
      }
    } catch {
      // left for a later run
    }
  }
}

function writeManifest(ctx, manifest) {
  const text = `${JSON.stringify(sortKeys(manifest), null, 2)}\n`;
  if (readOrNull(ctx.manifestPath) === text) return;
  ensureDir(ctx, manifest, ctx.aifHome, 'manifest');
  fs.writeFileSync(ctx.manifestPath, text);
}

// Two config texts are equivalent when they hold the same data once the aif
// parts are removed; then the backup's exact bytes can come back.
function equivalent(format, a, b) {
  if (a === null || b === null) return a === b;
  if (format === 'json') {
    try {
      return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
    } catch {
      return false;
    }
  }
  return a.trimEnd() === b.trimEnd();
}

/**
 * Decide how to undo one manifest entry. Returns {action, write?, unlink?,
 * restore?, warning?}; target supplies revert() for config entries.
 */
function planRemoval(file, entry, target) {
  const current = readOrNull(file);
  const backup = entry.backup ? readOrNull(entry.backup) : null;
  if (current === null) {
    return backup !== null ? { action: 'restore', restore: true } : { action: 'gone' };
  }
  if (entry.kind === 'config' && target) {
    const reverted = target.revert(current);
    if (backup !== null) {
      if (equivalent(entry.format, reverted, target.revert(backup))) return { action: 'restore', restore: true };
      return { action: 'revert', write: reverted, keepBackup: true, warning: `${file} changed after install; removed the aif entries and kept ${entry.backup}` };
    }
    if (entry.created && reverted === null) return { action: 'remove', unlink: true };
    if (reverted === null) return { action: 'revert', write: '' };
    return reverted === current ? { action: 'unchanged' } : { action: 'revert', write: reverted };
  }
  if (sha256(current) !== entry.sha256) {
    return { action: 'keep', warning: `${file} changed after install; left in place${entry.backup ? ` with ${entry.backup}` : ''}` };
  }
  if (entry.created) return { action: 'remove', unlink: true };
  if (backup !== null) return { action: 'restore', restore: true };
  return { action: 'keep' };
}

function applyRemoval(file, entry, step) {
  if (step.restore) {
    fs.writeFileSync(file, fs.readFileSync(entry.backup));
    fs.unlinkSync(entry.backup);
  } else if (step.unlink) {
    fs.unlinkSync(file);
  } else if (step.write !== undefined) {
    fs.writeFileSync(file, step.write);
  }
}

function targetsByPath(owners, ctx) {
  const map = new Map();
  for (const owner of owners) for (const t of renderOwner(owner, ctx)) map.set(t.path, t);
  return map;
}

function install(runtimes, ctx, manifest, dryRun) {
  const owners = new Set(runtimes);
  const installedHook = Object.values(manifest.entries).some((e) => HOOK_RUNTIMES.has(e.owner));
  if (runtimes.some((r) => HOOK_RUNTIMES.has(r)) || installedHook) owners.add('shared');

  const desired = targetsByPath(owners, ctx);
  const steps = [];
  const errors = [];
  for (const [file, t] of desired) {
    const current = readOrNull(file);
    let content;
    try {
      content = t.kind === 'config' ? t.apply(current) : t.content;
    } catch (error) {
      if (!(error instanceof ParseError)) throw error;
      errors.push(error.message);
      continue;
    }
    const entry = manifest.entries[file];
    const backup = file + BACKUP_SUFFIX;
    if (!entry && current !== null && current !== content && fs.existsSync(backup)) {
      errors.push(`${backup} already exists and is not aif's; move it, then rerun`);
      continue;
    }
    const action = current === null ? 'create' : current === content ? 'unchanged' : 'update';
    steps.push({ file, target: t, current, content, action });
  }
  // Entries this install no longer produces (an agent or rule was removed).
  const stale = Object.keys(manifest.entries).filter((f) => owners.has(manifest.entries[f].owner) && !desired.has(f)).sort();
  const removals = [];
  for (const file of stale) {
    try {
      removals.push({ file, entry: manifest.entries[file], step: planRemoval(file, manifest.entries[file], null) });
    } catch (error) {
      if (!(error instanceof ParseError)) throw error;
      errors.push(error.message);
    }
  }
  if (errors.length) return { errors, actions: [], warnings: [] };

  const actions = steps.map((s) => ({ action: s.action, path: s.file, owner: s.target.owner }))
    .concat(removals.map((r) => ({ action: 'remove', path: r.file, owner: r.entry.owner })));
  const warnings = removals.filter((r) => r.step.warning).map((r) => r.step.warning);
  if (dryRun) return { errors, actions, warnings };

  for (const s of steps) {
    let entry = manifest.entries[s.file];
    if (!entry) {
      entry = { owner: s.target.owner, kind: s.target.kind, created: s.current === null, backup: null, sha256: null };
      if (s.target.format) entry.format = s.target.format;
      if (s.current !== null && s.current !== s.content) {
        entry.backup = s.file + BACKUP_SUFFIX;
        fs.writeFileSync(entry.backup, s.current);
      }
      manifest.entries[s.file] = entry;
    }
    if (s.action !== 'unchanged') {
      ensureDir(ctx, manifest, path.dirname(s.file), s.target.owner);
      fs.writeFileSync(s.file, s.content);
    }
    entry.sha256 = sha256(s.content);
  }
  for (const r of removals) {
    applyRemoval(r.file, r.entry, r.step);
    delete manifest.entries[r.file];
  }
  removeEmptyDirs(manifest, owners);
  writeManifest(ctx, manifest);
  return { errors, actions, warnings };
}

function uninstall(runtimes, ctx, manifest, dryRun) {
  const owners = new Set(runtimes);
  const remainingHook = Object.values(manifest.entries).some((e) => HOOK_RUNTIMES.has(e.owner) && !owners.has(e.owner));
  if (!remainingHook) owners.add('shared');

  const files = Object.keys(manifest.entries).filter((f) => owners.has(manifest.entries[f].owner)).sort();
  const configOwners = new Set(files.filter((f) => manifest.entries[f].kind === 'config').map((f) => manifest.entries[f].owner));
  const targets = targetsByPath(configOwners, ctx);
  const plan = [];
  const errors = [];
  for (const file of files) {
    const entry = manifest.entries[file];
    try {
      plan.push({ file, entry, step: planRemoval(file, entry, targets.get(file)) });
    } catch (error) {
      if (!(error instanceof ParseError)) throw error;
      errors.push(error.message);
    }
  }
  if (errors.length) return { errors, actions: [], warnings: [] };

  const actions = plan.map((p) => ({ action: p.step.action, path: p.file, owner: p.entry.owner }));
  const warnings = plan.filter((p) => p.step.warning).map((p) => p.step.warning);
  if (dryRun) return { errors, actions, warnings };

  for (const p of plan) {
    applyRemoval(p.file, p.entry, p.step);
    delete manifest.entries[p.file];
  }
  removeEmptyDirs(manifest, owners);
  if (Object.keys(manifest.entries).length === 0) {
    if (fs.existsSync(ctx.manifestPath)) fs.unlinkSync(ctx.manifestPath);
    removeEmptyDirs(manifest, null);
  } else {
    writeManifest(ctx, manifest);
  }
  return { errors, actions, warnings };
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`aif-install: ${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const home = path.resolve(args.home || os.homedir());
  const ctx = context(home);
  const runtimes = args.runtime === 'all' ? RUNTIMES : [args.runtime];
  let result;
  try {
    const manifest = loadManifest(ctx);
    result = (args.uninstall ? uninstall : install)(runtimes, ctx, manifest, args.dryRun);
  } catch (error) {
    if (!(error instanceof ParseError) && !/shell-special/.test(error.message)) throw error;
    result = { errors: [error.message], actions: [], warnings: [] };
  }
  const summary = { mode: args.uninstall ? 'uninstall' : 'install', runtimes, home, dryRun: args.dryRun, ...result };
  if (args.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    for (const message of result.errors) process.stderr.write(`aif-install: ${message}\n`);
    if (!result.errors.length) {
      const verb = args.dryRun ? 'would ' : '';
      for (const a of result.actions) process.stdout.write(`${verb}${a.action.padEnd(9)} ${a.path}\n`);
      for (const w of result.warnings) process.stderr.write(`aif-install: warning: ${w}\n`);
      if (!args.dryRun) process.stdout.write(`aif-install: ${summary.mode} done for ${runtimes.join(', ')} under ${home}\n`);
      if (!args.dryRun && !args.uninstall && runtimes.includes('codex')) {
        process.stdout.write('aif-install: Codex runs a new hook only after you review it; start `codex` and approve the aif hooks when it asks.\n');
      }
    } else {
      process.stderr.write('aif-install: nothing was changed\n');
    }
  }
  return result.errors.length ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, parseArgs };
