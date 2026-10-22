'use strict';
// Codex: one TOML file per agent, [agents.*] tables and [features] hooks in
// config.toml, the rules in an AGENTS.md block, and hooks.json entries that
// run ~/.aif/hooks with AIF_RUNTIME=codex.
const path = require('path');
const { assertSafePath, loadAgents, loadModels, loadRules, tomlString } = require('./common.cjs');
const { codexConfig, groupedHooks, markdownBlock } = require('./merge.cjs');

const HOOKS = [
  { event: 'PreToolUse', matcher: 'Bash', hook: 'scout-block' },
  { event: 'PreToolUse', matcher: 'Write|Edit|Bash|apply_patch', hook: 'privacy-block' },
  { event: 'SessionStart', matcher: 'startup|resume|clear|compact', hook: 'session-init' },
  { event: 'SubagentStart', matcher: '*', hook: 'subagent-init' },
  { event: 'UserPromptSubmit', matcher: '*', hook: 'secret-output-guardrail' },
  { event: 'UserPromptSubmit', matcher: '*', hook: 'dev-rules-reminder' },
];

// The single-quoted YAML descriptions carry literal "\n" sequences.
function flatDescription(text) {
  return String(text || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function multiline(body) {
  if (!body.includes("'''")) return `'''\n${body}'''`;
  return `"""\n${body.replace(/\\/g, '\\\\').replace(/"""/g, '""\\"')}"""`;
}

function agentToml(agent, model) {
  const lines = [`name = ${tomlString(agent.id)}`, `description = ${tomlString(flatDescription(agent.description))}`];
  if (model && model.model) lines.push(`model = ${tomlString(model.model)}`);
  if (model && model.reasoningEffort) lines.push(`model_reasoning_effort = ${tomlString(model.reasoningEffort)}`);
  const body = agent.body.replace(/^\n+/, '');
  lines.push(`developer_instructions = ${multiline(body.endsWith('\n') ? body : `${body}\n`)}`);
  return `${lines.join('\n')}\n`;
}

function render({ home, hooksDir, marker }) {
  const base = path.join(home, '.codex');
  const models = loadModels();
  const agents = loadAgents();
  const targets = agents.map((agent) => ({
    path: path.join(base, 'agents', `${agent.id}.toml`),
    owner: 'codex',
    kind: 'file',
    content: agentToml(agent, models[agent.name] && models[agent.name].codex),
  }));
  const configFile = path.join(base, 'config.toml');
  const tables = agents.map((a) => ({ id: a.id, configFile: `agents/${a.id}.toml`, description: flatDescription(a.description) }));
  targets.push({ path: configFile, owner: 'codex', kind: 'config', format: 'toml', ...codexConfig(configFile, tables) });

  const rules = loadRules().map((r) => `## Rule: ${r.name}\n\n${r.content.trim()}\n`).join('\n');
  const agentsMd = path.join(base, 'AGENTS.md');
  targets.push({
    path: agentsMd, owner: 'codex', kind: 'config', format: 'markdown',
    ...markdownBlock(agentsMd, '<!-- aif:rules begin -->', '<!-- aif:rules end -->', rules),
  });

  const entries = HOOKS.map((h) => {
    const script = assertSafePath(path.join(hooksDir, `${h.hook}.cjs`));
    return {
      event: h.event,
      matcher: h.matcher,
      command: `AIF_RUNTIME=codex node "${script}"`,
      commandWindows: `$env:AIF_RUNTIME="codex"; node "${script}"`,
    };
  });
  const hooksFile = path.join(base, 'hooks.json');
  targets.push({ path: hooksFile, owner: 'codex', kind: 'config', format: 'json', ...groupedHooks(hooksFile, entries, marker) });
  return targets;
}

module.exports = { HOOKS, agentToml, render };
