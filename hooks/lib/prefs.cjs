#!/usr/bin/env node
'use strict';
// aif preferences: defaults < ~/.aif.json < <project>/.aif.json.
// Self-contained (no local requires) so hooks can ship an identical copy.
//
//   prefs.cjs resolve [--json]        merged preferences
//   prefs.cjs get <key>                one value (true/false, string, or JSON)
//   prefs.cjs set <key> <value> [--user]
//   prefs.cjs unset <key> [--user]
//   prefs.cjs validate [--json]        exit 3 when a config file is invalid
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Each aif hook can be switched off with `hooks.<name>: false`.
const HOOK_NAMES = ['session-init', 'subagent-init', 'dev-rules-reminder', 'privacy-block', 'scout-block', 'secret-output-guardrail'];

const DEFAULTS = {
  plans: { dir: 'plans', naming: '{date}-{slug}', dateFormat: 'YYMMDD-HHmm' },
  reports: { dir: 'plans/reports' },
  journal: { auto: true, dir: 'plans/journals' },
  language: null,
  hooks: Object.fromEntries(HOOK_NAMES.map((name) => [name, true])),
};

// Supported keys and the type each must hold.
const SCHEMA = {
  'plans.dir': 'string',
  'plans.naming': 'string',
  'plans.dateFormat': 'string',
  'reports.dir': 'string',
  'journal.auto': 'boolean',
  'journal.dir': 'string',
  language: 'string',
  ...Object.fromEntries(HOOK_NAMES.map((name) => [`hooks.${name}`, 'boolean'])),
};

const CONFIG_NAME = '.aif.json';

function projectRoot(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return path.resolve(cwd);
  }
}

function configPaths(cwd) {
  return { user: path.join(os.homedir(), CONFIG_NAME), project: path.join(projectRoot(cwd), CONFIG_NAME) };
}

function readConfig(file) {
  if (!fs.existsSync(file)) return { data: {}, error: null };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { data: {}, error: 'top level must be an object' };
    return { data, error: null };
  } catch (e) {
    return { data: {}, error: e.message };
  }
}

function getPath(obj, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function setPath(obj, key, value) {
  const parts = key.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) {
    if (!o[p] || typeof o[p] !== 'object') o[p] = {};
    o = o[p];
  }
  if (value === undefined) delete o[parts[parts.length - 1]];
  else o[parts[parts.length - 1]] = value;
}

function schemaErrors(data) {
  const errors = [];
  for (const [key, type] of Object.entries(SCHEMA)) {
    const v = getPath(data, key);
    if (v !== undefined && v !== null && typeof v !== type) errors.push(`${key} must be a ${type}`);
  }
  return errors;
}

// Merge only valid, supported keys so a bad file never breaks resolution.
function resolvePrefs(cwd = process.cwd()) {
  const prefs = JSON.parse(JSON.stringify(DEFAULTS));
  const sources = [];
  const paths = configPaths(cwd);
  for (const scope of ['user', 'project']) {
    const { data, error } = readConfig(paths[scope]);
    if (error) { sources.push({ scope, file: paths[scope], error }); continue; }
    if (fs.existsSync(paths[scope])) sources.push({ scope, file: paths[scope] });
    for (const [key, type] of Object.entries(SCHEMA)) {
      const v = getPath(data, key);
      if (v !== undefined && (v === null || typeof v === type)) setPath(prefs, key, v);
    }
  }
  return { prefs, sources, root: projectRoot(cwd) };
}

function parseValue(key, raw) {
  const type = SCHEMA[key];
  if (type === 'boolean') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`${key} expects true or false`);
  }
  return raw;
}

function writeConfig(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function main(argv) {
  const json = argv.includes('--json');
  const user = argv.includes('--user');
  const [cmd, key, value] = argv.filter((a) => !a.startsWith('--'));
  const out = (obj, text) => process.stdout.write((json ? JSON.stringify(obj, null, 2) : text) + '\n');

  switch (cmd) {
    case 'resolve': {
      const r = resolvePrefs();
      const lines = Object.keys(SCHEMA).map((k) => `${k}=${JSON.stringify(getPath(r.prefs, k))}`);
      return out(r, lines.join('\n'));
    }
    case 'get': {
      if (!key) throw new Error('usage: prefs.cjs get <key>');
      const v = getPath(resolvePrefs().prefs, key);
      return out({ key, value: v === undefined ? null : v }, typeof v === 'string' ? v : JSON.stringify(v ?? null));
    }
    case 'set':
    case 'unset': {
      if (!SCHEMA[key]) throw new Error(`unsupported key: ${key} (supported: ${Object.keys(SCHEMA).join(', ')})`);
      if (cmd === 'set' && value === undefined) throw new Error('usage: prefs.cjs set <key> <value> [--user]');
      const file = configPaths()[user ? 'user' : 'project'];
      const { data, error } = readConfig(file);
      if (error) throw new Error(`${file} is invalid (${error}); fix it before setting values`);
      setPath(data, key, cmd === 'set' ? parseValue(key, value) : undefined);
      writeConfig(file, data);
      return out({ file, key, value: cmd === 'set' ? getPath(data, key) : null }, `${cmd === 'set' ? 'set' : 'unset'} ${key} in ${file}`);
    }
    case 'validate': {
      const results = Object.entries(configPaths()).map(([scope, file]) => {
        if (!fs.existsSync(file)) return { scope, file, exists: false, errors: [] };
        const { data, error } = readConfig(file);
        return { scope, file, exists: true, errors: error ? [error] : schemaErrors(data) };
      });
      const ok = results.every((r) => r.errors.length === 0);
      out({ ok, results }, results.map((r) =>
        `${r.scope}: ${!r.exists ? 'not present' : r.errors.length ? r.errors.join('; ') : 'ok'} (${r.file})`).join('\n'));
      process.exitCode = ok ? 0 : 3;
      return;
    }
    default:
      throw new Error('usage: prefs.cjs resolve|get|set|unset|validate [--json] [--user]');
  }
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { process.stderr.write(`prefs: ${e.message}\n`); process.exitCode = 1; }
}

module.exports = { resolvePrefs, projectRoot, DEFAULTS, SCHEMA, HOOK_NAMES };
