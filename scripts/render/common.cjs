'use strict';
// Shared readers for the canonical sources (agents/, rules/, hooks/) and the
// small text helpers every runtime renderer uses.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const HOOK_NAMES = ['session-init', 'subagent-init', 'dev-rules-reminder', 'privacy-block', 'scout-block', 'secret-output-guardrail'];

// Split "---\n<frontmatter>\n---\n<body>" into frontmatter lines and body.
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  return { lines: m[1].split('\n'), body: m[2] };
}

// The value of a top-level frontmatter key: plain, single- or double-quoted,
// or a folded/literal block (>-, |). Returns a single string.
function frontmatterValue(lines, key) {
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (i === -1) return null;
  const rest = lines[i].slice(key.length + 1).trim();
  if (/^[>|][+-]?$/.test(rest)) {
    const block = [];
    for (let j = i + 1; j < lines.length && /^\s+\S|^\s*$/.test(lines[j]); j++) block.push(lines[j].trim());
    return block.join(rest.startsWith('>') ? ' ' : '\n').trim();
  }
  if (rest.startsWith("'") && rest.endsWith("'")) return rest.slice(1, -1).replace(/''/g, "'");
  if (rest.startsWith('"') && rest.endsWith('"')) return JSON.parse(rest);
  return rest;
}

// Replace (or with null, drop) a top-level key, including a block value's
// continuation lines.
function setFrontmatterLine(lines, key, line) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(`${key}:`)) { out.push(lines[i]); continue; }
    if (line !== null) out.push(line);
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i++;
  }
  return out;
}

function joinFrontmatter(lines, body) {
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

function loadAgents(root = repoRoot) {
  const dir = path.join(root, 'agents');
  return fs.readdirSync(dir).filter((f) => /^aif-.+\.md$/.test(f)).sort().map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { lines, body } = splitFrontmatter(raw);
    return {
      id: file.replace(/\.md$/, ''),
      name: file.replace(/^aif-/, '').replace(/\.md$/, ''),
      raw,
      lines,
      body,
      description: frontmatterValue(lines, 'description'),
      model: frontmatterValue(lines, 'model'),
    };
  });
}

function loadModels(root = repoRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, 'agents', 'runtime-models.json'), 'utf8')).agents;
}

function loadRules(root = repoRoot) {
  const dir = path.join(root, 'rules');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((file) => ({
    name: file.replace(/\.md$/, ''),
    content: fs.readFileSync(path.join(dir, file), 'utf8'),
  }));
}

// First sentence of the first prose paragraph (skips the title).
function ruleSummary(content) {
  const para = content.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith('#'));
  if (!para) return '';
  const flat = para.replace(/\s+/g, ' ');
  const m = flat.match(/^(.*?[.!?])(\s|$)/);
  return (m ? m[1] : flat).trim();
}

// Cursor and OMP inject a rule only when its frontmatter says to: the core
// rules always apply, the rest are offered to the model by description.
const ALWAYS_APPLY = new Set(['development-rules', 'primary-workflow']);

function ruleWithFrontmatter(rule) {
  const front = ALWAYS_APPLY.has(rule.name)
    ? ['alwaysApply: true']
    : [`description: ${JSON.stringify(ruleSummary(rule.content))}`, 'alwaysApply: false'];
  return `---\n${front.join('\n')}\n---\n${rule.content}`;
}

// The plugin hook wiring in hooks/hooks.json, flattened to
// [{event, matcher, hook}] in file order.
function pluginHookEntries(root = repoRoot) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'hooks.json'), 'utf8'));
  const out = [];
  for (const [event, groups] of Object.entries(config.hooks)) {
    for (const group of groups) {
      for (const h of group.hooks) {
        const m = h.command.match(/hooks\/([a-z-]+)\.cjs/);
        if (m) out.push({ event, matcher: group.matcher, hook: m[1] });
      }
    }
  }
  return out;
}

// Paths go into shell command strings; refuse characters a shell would act on.
function assertSafePath(p) {
  const unsafe = process.platform === 'win32' ? /["'`$\n]/ : /["'`$\\\n]/;
  if (unsafe.test(p)) throw new Error(`refusing a path with shell-special characters: ${p}`);
  return p;
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

module.exports = {
  HOOK_NAMES,
  assertSafePath,
  frontmatterValue,
  joinFrontmatter,
  loadAgents,
  loadModels,
  loadRules,
  pluginHookEntries,
  repoRoot,
  ruleSummary,
  ruleWithFrontmatter,
  setFrontmatterLine,
  splitFrontmatter,
  tomlString,
};
