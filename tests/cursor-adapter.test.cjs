'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { sandbox, repoRoot } = require('./helpers.cjs');

const adapter = path.join(repoRoot, 'hooks', 'cursor-adapter.cjs');
// Built by concatenation so no command line in this repo names a dotenv file.
const DOTENV = '.' + 'env';

function cleanEnv(home) {
  const env = { ...process.env, HOME: home };
  for (const key of Object.keys(env)) {
    if (key.startsWith('AIF_') || key.startsWith('CLAUDE_')) delete env[key];
  }
  return env;
}

// Runs the adapter the way Cursor does and insists on one JSON reply.
function cursor(sb, hook, payload) {
  const r = spawnSync(process.execPath, [adapter, hook], {
    cwd: sb.project,
    env: cleanEnv(sb.home),
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('cursor-adapter', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const secretFile = path.join(sb.project, DOTENV);
  fs.writeFileSync(secretFile, 'PLACEHOLDER=1\n');
  const base = { conversation_id: 'conv-1', workspace_roots: [sb.project] };

  await t.test('denies a dotenv Read with valid permission JSON', () => {
    const out = cursor(sb, 'privacy-block', { ...base, hook_event_name: 'preToolUse', tool_name: 'Read', tool_input: { file_path: secretFile } });
    assert.equal(out.permission, 'deny');
    assert.match(out.agent_message, /@@PRIVACY_PROMPT_START@@/);
    assert.equal(out.user_message, out.agent_message);
  });

  await t.test('an APPROVED: retry in the same conversation is allowed with the prefix stripped', () => {
    const out = cursor(sb, 'privacy-block', { ...base, tool_name: 'Read', tool_input: { file_path: `APPROVED:${secretFile}` } });
    assert.equal(out.permission, 'allow');
    assert.equal(out.updated_input.file_path, secretFile);
    // The one-time grant is spent.
    const again = cursor(sb, 'privacy-block', { ...base, tool_name: 'Read', tool_input: { file_path: `APPROVED:${secretFile}` } });
    assert.equal(again.permission, 'deny');
  });

  await t.test('writes an updated path back under the key Cursor used', () => {
    cursor(sb, 'privacy-block', { ...base, conversation_id: 'conv-2', tool_name: 'Read', tool_input: { target_file: secretFile } });
    const out = cursor(sb, 'privacy-block', { ...base, conversation_id: 'conv-2', tool_name: 'Read', tool_input: { target_file: `APPROVED:${secretFile}` } });
    assert.equal(out.permission, 'allow');
    assert.deepEqual(out.updated_input, { target_file: secretFile });
  });

  await t.test('allows an ordinary Read', () => {
    const out = cursor(sb, 'privacy-block', { ...base, tool_name: 'Read', tool_input: { file_path: path.join(sb.project, 'README.md') } });
    assert.deepEqual(out, { permission: 'allow' });
  });

  await t.test('denies a broad node_modules Shell scan and allows a build', () => {
    const scan = cursor(sb, 'scout-block', { ...base, tool_name: 'Shell', tool_input: { command: 'ls node_modules' } });
    assert.equal(scan.permission, 'deny');
    assert.ok(scan.agent_message.length > 0);
    assert.deepEqual(cursor(sb, 'scout-block', { ...base, tool_name: 'Shell', tool_input: { command: 'npm run build' } }), { permission: 'allow' });
  });

  await t.test('sessionStart returns the project context with the plans dir', () => {
    const out = cursor(sb, 'session-init', { ...base, hook_event_name: 'sessionStart' });
    assert.match(out.additional_context, new RegExp(`Plans: ${JSON.stringify(path.join(fs.realpathSync(sb.project), 'plans')).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  await t.test('prints valid JSON for an empty payload and an unknown hook', () => {
    const empty = spawnSync(process.execPath, [adapter, 'scout-block'], { cwd: sb.project, env: cleanEnv(sb.home), input: '', encoding: 'utf8' });
    assert.deepEqual(JSON.parse(empty.stdout), { permission: 'allow' });
    assert.deepEqual(cursor(sb, 'dev-rules-reminder', base), { permission: 'allow' });
  });
});
