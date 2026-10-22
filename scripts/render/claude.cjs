'use strict';
// Claude Code without the plugin: agents and rules under ~/.claude, hooks
// merged into ~/.claude/settings.json and pointed at ~/.aif/hooks. The hooks
// recognise Claude Code through CLAUDE_PROJECT_DIR, so no runtime prefix.
const path = require('path');
const { assertSafePath, loadAgents, loadRules, pluginHookEntries } = require('./common.cjs');
const { groupedHooks } = require('./merge.cjs');

function render({ home, hooksDir, marker }) {
  const base = path.join(home, '.claude');
  const targets = [];
  for (const agent of loadAgents()) {
    targets.push({ path: path.join(base, 'agents', `${agent.id}.md`), owner: 'claude', kind: 'file', content: agent.raw });
  }
  for (const rule of loadRules()) {
    targets.push({ path: path.join(base, 'rules', `aif-${rule.name}.md`), owner: 'claude', kind: 'file', content: rule.content });
  }
  const entries = pluginHookEntries().map((e) => ({
    event: e.event,
    matcher: e.matcher,
    command: `node "${assertSafePath(path.join(hooksDir, `${e.hook}.cjs`))}"`,
  }));
  const file = path.join(base, 'settings.json');
  targets.push({ path: file, owner: 'claude', kind: 'config', format: 'json', ...groupedHooks(file, entries, marker) });
  return targets;
}

module.exports = { render };
