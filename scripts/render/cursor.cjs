'use strict';
// Cursor: agents (no tools line, Cursor model ids), rules as .mdc, and
// hooks.json entries that run the shared hooks through cursor-adapter.cjs.
// Cursor's prompt and subagent events cannot add context, so the reminder,
// subagent-init and guardrail hooks are not wired; the rules reach every
// chat through the alwaysApply .mdc files instead.
const path = require('path');
const { assertSafePath, joinFrontmatter, loadAgents, loadModels, loadRules, ruleWithFrontmatter, setFrontmatterLine } = require('./common.cjs');
const { cursorHooks } = require('./merge.cjs');

const HOOKS = [
  { event: 'sessionStart', hook: 'session-init' },
  { event: 'preToolUse', matcher: 'Read|Write|Shell', hook: 'privacy-block' },
  { event: 'preToolUse', matcher: 'Shell|Read', hook: 'scout-block' },
];

function render({ home, hooksDir, marker }) {
  const base = path.join(home, '.cursor');
  const models = loadModels();
  const targets = loadAgents().map((agent) => {
    let lines = setFrontmatterLine(agent.lines, 'tools', null);
    const model = models[agent.name] && models[agent.name].cursor;
    if (model) lines = setFrontmatterLine(lines, 'model', `model: ${model}`);
    return { path: path.join(base, 'agents', `${agent.id}.md`), owner: 'cursor', kind: 'file', content: joinFrontmatter(lines, agent.body) };
  });
  for (const rule of loadRules()) {
    targets.push({ path: path.join(base, 'rules', `aif-${rule.name}.mdc`), owner: 'cursor', kind: 'file', content: ruleWithFrontmatter(rule) });
  }
  const adapter = assertSafePath(path.join(hooksDir, 'cursor-adapter.cjs'));
  const entries = HOOKS.map((h) => ({ event: h.event, matcher: h.matcher, command: `node "${adapter}" ${h.hook}` }));
  const file = path.join(base, 'hooks.json');
  targets.push({ path: file, owner: 'cursor', kind: 'config', format: 'json', ...cursorHooks(file, entries, marker) });
  return targets;
}

module.exports = { HOOKS, render };
