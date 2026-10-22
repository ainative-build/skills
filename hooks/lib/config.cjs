'use strict';

/**
 * Settings and project context for the aif hooks.
 *
 * Preferences come from prefs.cjs, a byte-identical copy of the aif-plan
 * script, so hooks and skills read `.aif.json` the same way. The active plan
 * comes from `plan.cjs resolve`, never from a second implementation of plan
 * lookup. Every reader here fails toward the defaults: a broken config file or
 * a missing plan script leaves the hooks on and reports no plan.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolvePrefs } = require('./prefs.cjs');

const HOOKS_DIR = path.join(__dirname, '..');
const PLAN_TIMEOUT_MS = 3000;
const MAX_DISPLAY_BYTES = 512;

function aifHome(environment = process.env) {
  return path.resolve(environment.AIF_HOME || path.join(os.homedir(), '.aif'));
}

function loadPrefs(cwd = process.cwd()) {
  try {
    return resolvePrefs(cwd);
  } catch {
    return null;
  }
}

/**
 * Whether a hook should run. Only an explicit `hooks.<name>: false` turns a
 * hook off; an unreadable config keeps it on, because the guard hooks must
 * fail toward guarding.
 */
function isHookEnabled(name, cwd = process.cwd()) {
  const resolved = loadPrefs(cwd);
  return resolved?.prefs?.hooks?.[name] !== false;
}

function planScriptPath(environment = process.env) {
  return environment.AIF_PLAN_CJS
    || path.join(HOOKS_DIR, '..', 'skills', 'engineering', 'aif-plan', 'scripts', 'plan.cjs');
}

function rulesDirectory(environment = process.env) {
  return environment.AIF_RULES_DIR || path.join(HOOKS_DIR, '..', 'rules');
}

/** The plan `plan.cjs resolve` picks for this project, or null. */
function resolveActivePlan(root, environment = process.env) {
  const script = planScriptPath(environment);
  if (!fs.existsSync(script)) return null;
  try {
    const stdout = execFileSync(process.execPath, [script, 'resolve', '--json'], {
      cwd: root,
      encoding: 'utf8',
      timeout: PLAN_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    return JSON.parse(stdout).match || null;
  } catch {
    return null;
  }
}

function gitBranch(root) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: root,
      encoding: 'utf8',
      timeout: PLAN_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim() || null;
  } catch {
    return null;
  }
}

function formatDate(date, format) {
  const pad = (n) => String(n).padStart(2, '0');
  return format
    .replace('YYYY', String(date.getFullYear()))
    .replace('YY', String(date.getFullYear()).slice(-2))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()));
}

/**
 * Quote a value for the injected context: control characters removed and the
 * length capped, so a branch name or path cannot forge extra prompt lines.
 */
function safeDisplayValue(value) {
  let text = String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
  if (Buffer.byteLength(text, 'utf8') > MAX_DISPLAY_BYTES) {
    text = Buffer.from(text, 'utf8').subarray(0, MAX_DISPLAY_BYTES).toString('utf8').replace(/�+$/, '');
  }
  return JSON.stringify(text);
}

/** A path relative to the root when it lies inside it, else absolute. */
function toDisplayPath(root, target) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : target;
}

/**
 * Everything the context hooks inject, resolved for one working directory.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {Date} [options.now]
 * @returns {{root: string, prefs: object, plansDir: string, reportsDir: string,
 *   docsDir: string, namePattern: string, language: string|null,
 *   activePlan: object|null, branch: string|null, rulesDir: string}}
 */
function loadContext({ cwd = process.cwd(), now = new Date(), environment = process.env } = {}) {
  const resolved = loadPrefs(cwd);
  const prefs = resolved?.prefs || {};
  const root = resolved?.root || cwd;
  const plansDir = path.resolve(root, prefs.plans?.dir || 'plans');
  const activePlan = resolveActivePlan(root, environment);
  const reportsDir = activePlan?.dir
    ? path.join(path.resolve(root, activePlan.dir), 'reports')
    : path.resolve(root, prefs.reports?.dir || 'plans/reports');
  const naming = prefs.plans?.naming || '{date}-{slug}';
  const namePattern = naming.replace('{date}', formatDate(now, prefs.plans?.dateFormat || 'YYMMDD-HHmm'));
  return {
    root,
    prefs,
    plansDir,
    reportsDir,
    docsDir: path.join(root, 'docs'),
    namePattern,
    language: prefs.language || null,
    activePlan,
    branch: gitBranch(root),
    rulesDir: rulesDirectory(environment),
  };
}

module.exports = {
  aifHome,
  formatDate,
  isHookEnabled,
  loadContext,
  resolveActivePlan,
  safeDisplayValue,
  toDisplayPath,
};
