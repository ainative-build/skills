#!/usr/bin/env node
/**
 * Cursor hook adapter: `node cursor-adapter.cjs <hook-name>`.
 *
 * Cursor sends its own payload (camelCase event names, conversation_id,
 * workspace_roots, Shell/Read/Write tool names) and expects its own reply
 * (`permission` for preToolUse, `additional_context` for sessionStart). The
 * aif hooks speak the Claude Code / Codex shape. This adapter translates the
 * payload, runs the hook with AIF_RUNTIME=cursor so blocks arrive as stdout
 * JSON, and translates the decision back.
 *
 * Cursor treats invalid JSON from a permission hook as a block, so every path,
 * including an internal crash, prints valid JSON. A crash allows the call, as
 * the hooks themselves fail open.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS = new Set(['session-init', 'privacy-block', 'scout-block']);
const HOOK_TIMEOUT_MS = 20000;
// Cursor names the file argument differently across tools and versions.
const PATH_KEYS = ['file_path', 'path', 'target_file', 'filePath', 'targetFile'];

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function shellToolName() {
  return process.platform === 'win32' ? 'PowerShell' : 'Bash';
}

function mapToolName(name) {
  if (name === 'Shell') return shellToolName();
  return typeof name === 'string' ? name : '';
}

function workspaceCwd(payload) {
  if (typeof payload.cwd === 'string' && payload.cwd) return payload.cwd;
  const roots = Array.isArray(payload.workspace_roots) ? payload.workspace_roots : [];
  const root = roots.find((r) => typeof r === 'string' && r);
  return root || process.cwd();
}

function sessionId(payload) {
  for (const key of ['session_id', 'conversation_id']) {
    if (typeof payload[key] === 'string' && payload[key]) return payload[key];
  }
  return undefined;
}

/**
 * Normalise Cursor's tool_input to the keys the hooks read (file_path,
 * command), remembering which key Cursor used so an updated input can be
 * written back under Cursor's own name.
 */
function normalizeToolInput(toolInput) {
  const input = toolInput && typeof toolInput === 'object' ? { ...toolInput } : {};
  let pathKey = null;
  if (!input.file_path) {
    pathKey = PATH_KEYS.slice(1).find((key) => typeof input[key] === 'string' && input[key]) || null;
    if (pathKey && pathKey !== 'path') {
      input.file_path = input[pathKey];
      delete input[pathKey];
    }
  }
  return { input, pathKey: pathKey === 'path' ? null : pathKey };
}

function denormalizeToolInput(updated, pathKey) {
  if (!updated || typeof updated !== 'object') return updated;
  if (!pathKey || !('file_path' in updated)) return updated;
  const out = { ...updated, [pathKey]: updated.file_path };
  delete out.file_path;
  return out;
}

function runHook(name, payload, cwd) {
  const env = { ...process.env, AIF_RUNTIME: 'cursor' };
  const r = spawnSync(process.execPath, [path.join(__dirname, `${name}.cjs`)], {
    cwd: fs.existsSync(cwd) ? cwd : process.cwd(),
    env,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: HOOK_TIMEOUT_MS,
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function parseJsonLines(text) {
  for (const line of text.split('\n').reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // keep looking
    }
  }
  return null;
}

function sessionStart(payload) {
  const cwd = workspaceCwd(payload);
  const r = runHook('session-init', {
    hook_event_name: 'SessionStart',
    session_id: sessionId(payload),
    cwd,
    source: 'startup',
  }, cwd);
  // session-init prints plain text; accept a JSON reply too.
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch { parsed = null; }
  const context = parsed && typeof parsed === 'object'
    ? (parsed.hookSpecificOutput?.additionalContext || '')
    : r.stdout.trim();
  return { additional_context: context || '' };
}

function preToolUse(name, payload) {
  const cwd = workspaceCwd(payload);
  const { input, pathKey } = normalizeToolInput(payload.tool_input);
  const r = runHook(name, {
    hook_event_name: 'PreToolUse',
    session_id: sessionId(payload),
    cwd,
    tool_name: mapToolName(payload.tool_name),
    tool_input: input,
    tool_use_id: payload.tool_use_id,
  }, cwd);

  const decision = parseJsonLines(r.stdout)?.hookSpecificOutput;
  const reason = (decision?.permissionDecisionReason || r.stderr || '').trim();

  if (r.code === 2 || decision?.permissionDecision === 'deny') {
    const message = reason || `Blocked by the aif ${name} hook.`;
    return { permission: 'deny', user_message: message, agent_message: message };
  }
  if (decision?.updatedInput) {
    const out = { permission: 'allow', updated_input: denormalizeToolInput(decision.updatedInput, pathKey) };
    if (reason) out.agent_message = reason;
    return out;
  }
  return { permission: 'allow' };
}

function main() {
  const name = process.argv[2];
  const payload = readStdin();
  if (!HOOKS.has(name)) return name === 'session-init' ? { additional_context: '' } : { permission: 'allow' };
  if (name === 'session-init') return sessionStart(payload);
  return preToolUse(name, payload);
}

let result;
try {
  result = main();
} catch (error) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('cursor-adapter', error, { event: process.argv[2] || 'unknown' });
  } catch (_) {}
  result = process.argv[2] === 'session-init' ? { additional_context: '' } : { permission: 'allow' };
}
// exitCode, not exit(): exit() can cut off stdout written to a pipe.
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = 0;
