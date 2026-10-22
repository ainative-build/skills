#!/usr/bin/env node
/**
 * privacy-block.cjs - Block access to sensitive files unless user-approved
 *
 * PRIVACY-based blocking (separate from SIZE-based scout-block).
 *
 * Flow (identical on every runtime and every tool, including shell commands):
 * 1. The model reads, writes, or edits ".env" -> DENIED (exit 2). The denial
 *    records a pending allow-once grant bound to this session, the normalized
 *    path, and the operation.
 * 2. The model asks the user through its runtime's ask-user capability.
 * 3. The user approves -> the model retries the same call with the path written
 *    as "APPROVED:.env". The hook finds the matching grant, consumes it, and
 *    returns the call with the marker removed (updatedInput), so the tool sees
 *    the real path. A second retry, or a marker without a grant, is denied.
 *
 * `.aifignore` (lib/aifignore.cjs) lists paths the guard skips. User-scope rules
 * in ~/.aif apply directly. Project rules arrive with a clone, so until
 * the user trusts their exact content the access stays denied and the approval
 * question also offers that trust; an approved retry records it. Every access
 * a trusted project rule opens prints a notice.
 *
 * Trust boundary: this is a model-cooperative guardrail against accidental
 * access, not a security boundary. The model can write the marker after any
 * denial without asking; the grant only limits that to one matching call. It
 * does not defend against a malicious or compromised model.
 *
 * Runtime differences stay out of the shared checker: the runtime that
 * lib/runtime.cjs detects selects how to ask the user and how to
 * express "run with the rewritten input" for that runtime.
 *
 * Core logic lives in lib/privacy-checker.cjs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { aifHome, loadAifignore, recordProjectTrust } = require('./lib/aifignore.cjs');

// Allow-once grants expire if the retry never arrives (user declined, turn
// ended, model moved on).
const GRANT_TTL_MS = 15 * 60 * 1000;
const GRANT_SCHEMA_VERSION = 1;
const MAX_GRANT_BYTES = 4096;

/**
 * Runtime presentation, keyed by the runtime id lib/runtime.cjs detects.
 *
 * allowDecision: the permissionDecision that must accompany updatedInput.
 * - Claude Code ignores updatedInput without a decision, and "allow" would skip
 *   the permission prompt for everything else the call carries (a whole shell
 *   command, a file write). "ask" applies the rewrite and shows the user the
 *   exact call in the native prompt, so the grant never widens permissions;
 *   in a non-interactive run nobody can answer and the call is denied.
 * - Codex applies updatedInput only with "allow" and does not support "ask".
 * - Cursor (through cursor-adapter.cjs) maps "allow" plus updatedInput to its
 *   preToolUse permission "allow" with updated_input; it has no "ask".
 * - Without a known runtime, no decision: harnesses that honor updatedInput on
 *   its own apply it; others run the unmodified call, whose
 *   marked path does not exist.
 */
const RUNTIME_PROFILES = {
  'claude-code': {
    askUser: 'Use the AskUserQuestion tool with the question above.',
    allowDecision: 'ask',
  },
  codex: {
    askUser: 'Call request_user_input with the question above when it is available. '
      + 'Otherwise ask the question as a plain chat message and end your turn to wait for the answer.',
    allowDecision: 'allow',
  },
  cursor: {
    askUser: 'Ask the user the question above as a plain chat message and end your turn to wait for the answer.',
    allowDecision: 'allow',
  },
};
const DEFAULT_RUNTIME_PROFILE = {
  askUser: 'Ask the user the question above as a plain chat message and end your turn to wait for the answer.',
  allowDecision: null,
};

function runtimeProfile(runtime) {
  return Object.prototype.hasOwnProperty.call(RUNTIME_PROFILES, runtime)
    ? RUNTIME_PROFILES[runtime]
    : DEFAULT_RUNTIME_PROFILE;
}

/**
 * Make a tool-controlled path safe to print: no control characters, so a path
 * cannot inject terminal escapes or forge extra lines into the denial.
 */
function displayPath(value) {
  return String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, '?');
}

// ─── Allow-once grant store ─────────────────────────────────────────────────

function grantsDirectory(environment = process.env) {
  return path.join(aifHome(environment), 'state', 'privacy-grants');
}

/**
 * Load the `.aifignore` rules for the session directory. Any failure loads no
 * rules, so it can only keep a path guarded.
 */
function loadAifignoreRules(cwd) {
  try {
    return loadAifignore({ cwd });
  } catch {
    return null;
  }
}

function normalizeGrantPath(filePath, cwd, normalizeProjectPath) {
  return normalizeProjectPath(path.resolve(cwd, filePath));
}

function grantFilePath(directory, grant) {
  const key = crypto.createHash('sha256')
    .update(JSON.stringify([grant.sessionId, grant.path, grant.operation]))
    .digest('hex');
  return path.join(directory, `${key}.json`);
}

function readGrant(filePath) {
  try {
    const info = fs.lstatSync(filePath);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_GRANT_BYTES) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function grantMatches(stored, grant, now) {
  return Boolean(
    stored && stored.schemaVersion === GRANT_SCHEMA_VERSION &&
    stored.sessionId === grant.sessionId && stored.path === grant.path &&
    stored.operation === grant.operation &&
    Number.isFinite(stored.expiresAt) && stored.expiresAt > now
  );
}

function pruneExpiredGrants(directory, now) {
  let entries;
  try {
    entries = fs.readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const filePath = path.join(directory, entry);
    const stored = readGrant(filePath);
    if (!stored || !(Number.isFinite(stored.expiresAt) && stored.expiresAt > now)) {
      try { fs.unlinkSync(filePath); } catch { /* concurrent prune or consume */ }
    }
  }
}

/**
 * Record a pending allow-once grant. Returns false when the grant could not be
 * stored; the caller still denies, so a storage failure only removes the
 * retry, never the block.
 */
function recordGrant(directory, grant, now = Date.now()) {
  try {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    pruneExpiredGrants(directory, now);
    const target = grantFilePath(directory, grant);
    const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    const value = { schemaVersion: GRANT_SCHEMA_VERSION, ...grant, createdAt: now, expiresAt: now + GRANT_TTL_MS };
    fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, target);
    return true;
  } catch {
    return false;
  }
}

function hasGrant(directory, grant, now = Date.now()) {
  return grantMatches(readGrant(grantFilePath(directory, grant)), grant, now);
}

/**
 * Consume a grant exactly once and return what was stored with it, or null.
 * Unlink is the atomic step: of two concurrent retries only one removes the
 * file, and the other is denied.
 */
function takeGrant(directory, grant, now = Date.now()) {
  const filePath = grantFilePath(directory, grant);
  const stored = readGrant(filePath);
  if (!grantMatches(stored, grant, now)) return null;
  try {
    fs.unlinkSync(filePath);
    return stored;
  } catch {
    return null;
  }
}

function consumeGrant(directory, grant, now = Date.now()) {
  return takeGrant(directory, grant, now) !== null;
}

// ─── Output ─────────────────────────────────────────────────────────────────

/**
 * Format the provider-neutral denial. Paths are printed as data; no shell
 * command is ever built from them.
 */
function formatBlockMessage({ result, runtime, retryAvailable }) {
  const operation = result.operation;
  const files = result.accesses.map(access => `  File: ${displayPath(access.filePath)} (${access.operation})`);
  const promptData = {
    ...result.promptData,
    file: displayPath(result.promptData.file),
    resolvedPath: displayPath(result.promptData.resolvedPath ?? result.promptData.file),
    basename: displayPath(result.promptData.basename),
    question: {
      ...result.promptData.question,
      text: displayPath(result.promptData.question.text),
      options: result.promptData.question.options.map(option => ({
        ...option,
        description: displayPath(option.description),
      })),
    },
  };
  const retry = retryAvailable
    ? [
      '  If the user approves: retry the same tool call once, unchanged except that each',
      '  protected path above is prefixed with APPROVED: . The hook removes the prefix before',
      `  the tool runs. The approval covers one ${operation} of these paths in this session`,
      `  and expires in ${Math.round(GRANT_TTL_MS / 60000)} minutes.`,
    ]
    : [
      '  Approval retry is unavailable here (no session identity or aif state could not',
      '  be written). Continue without this file.',
    ];

  return [
    '',
    'NOTE: This is not an error - this block protects sensitive data.',
    '',
    `PRIVACY BLOCK: Sensitive file ${operation} requires user approval`,
    '',
    ...files,
    '',
    '  This file may contain secrets (API keys, passwords, tokens).',
    '',
    '@@PRIVACY_PROMPT_START@@',
    JSON.stringify(promptData, null, 2),
    '@@PRIVACY_PROMPT_END@@',
    '',
    `  Ask the user: ${runtimeProfile(runtime).askUser}`,
    ...retry,
    '  If the user declines, or no answer is possible (for example a non-interactive run):',
    '  continue without this file. Do not reach it through another tool or command.',
    '',
  ].join('\n');
}

/**
 * Build the PreToolUse output that runs the approved call with the marker
 * removed. Runtimes read hookSpecificOutput.updatedInput; only the
 * accompanying decision differs (see RUNTIME_PROFILES).
 */
function buildApprovedOutput({ runtime, updatedInput, reason }) {
  const hookSpecificOutput = { hookEventName: 'PreToolUse', updatedInput };
  const { allowDecision } = runtimeProfile(runtime);
  if (allowDecision) {
    hookSpecificOutput.permissionDecision = allowDecision;
    hookSpecificOutput.permissionDecisionReason = reason;
  }
  return { hookSpecificOutput };
}

/**
 * The notice for sensitive paths a trusted project .aifignore opened, or null.
 * Repository-supplied rules opened them, so the user is told every time.
 * Claude Code shows the stderr of an allowed call only in verbose mode, so
 * there it also goes out as a systemMessage.
 */
function projectSkipNotice(result) {
  if (!result.projectSkipped?.length) return null;
  const files = result.projectSkipped.map(access => displayPath(access.filePath)).join(', ');
  return `Privacy guard skipped ${files} because a trusted project .aifignore allows it.`;
}

module.exports = {
  GRANT_TTL_MS,
  buildApprovedOutput,
  consumeGrant,
  formatBlockMessage,
  grantsDirectory,
  hasGrant,
  recordGrant,
  runtimeProfile,
};

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { createHookTimer } = require('./lib/hook-logger.cjs');
  const { blockToolUse } = require('./lib/hook-block.cjs');
  const { isHookEnabled } = require('./lib/config.cjs');
  const {
    checkPrivacy,
    extractPaths,
    hasApprovalPrefix,
    isPrivacySensitive,
    stripApprovalMarkers,
  } = require('./lib/privacy-checker.cjs');
  const {
    RUNTIME_MARKER_FILE,
    normalizeProjectPath,
    normalizeSessionId,
    readRuntimeMarker,
  } = require('./lib/runtime.cjs');

  if (!isHookEnabled('privacy-block')) {
    process.exit(0);
  }

  const timer = createHookTimer('privacy-block', { event: 'PreToolUse' });
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch (e) {
    timer.end({ status: 'warn', exit: 0, note: 'json-parse-failed', error: e.message });
    process.exit(0); // Invalid JSON, allow
  }

  const { tool_input: toolInput, tool_name: toolName } = hookData || {};
  const runtime = readRuntimeMarker(path.join(__dirname, RUNTIME_MARKER_FILE));
  const sessionId = normalizeSessionId(hookData?.session_id);
  const cwd = typeof hookData?.cwd === 'string' && hookData.cwd ? hookData.cwd : process.cwd();
  const directory = grantsDirectory();
  const grantFor = access => ({
    sessionId,
    path: normalizeGrantPath(access.filePath, cwd, normalizeProjectPath),
    operation: access.operation,
  });

  const aifignore = loadAifignoreRules(cwd);
  // Trust in project rules is offered and recorded only where a known runtime
  // asks the user through its own ask-user tool.
  const canTrust = runtimeProfile(runtime) !== DEFAULT_RUNTIME_PROFILE;
  const result = checkPrivacy({
    toolName,
    toolInput,
    options: {
      cwd,
      aifignore,
      offerTrust: canTrust,
      // No session identity means no grant can be bound: fail closed.
      isGranted: access => Boolean(sessionId) && hasGrant(directory, grantFor(access)),
    },
  });

  const target = path.basename(result.filePath || '');

  if (result.approved) {
    const approvedPaths = result.accesses.map(access => access.filePath);
    const updatedInput = stripApprovalMarkers(toolInput, approvedPaths);
    // Never hand the control marker to the real tool: if any approved path
    // still carries it after stripping, deny instead of guessing.
    const markerSurvives = extractPaths(updatedInput, toolName)
      .some(entry => hasApprovalPrefix(entry.value) && isPrivacySensitive(entry.value, { ignoreCase: entry.ignoreCase, glob: entry.glob }));
    // Stop at the first missing grant, so a failed retry leaves the rest.
    const grants = [];
    for (const access of markerSurvives ? [] : result.accesses) {
      const grant = takeGrant(directory, grantFor(access));
      if (!grant) break;
      grants.push(grant);
    }
    const consumed = !markerSurvives && grants.length === result.accesses.length;
    if (consumed) {
      // The user answered the question that offered trust in the project
      // .aifignore: record it, but only for the content they were shown, and
      // only where the question could offer it.
      const trust = grants.find(grant => grant.projectIgnoreTrust)?.projectIgnoreTrust;
      if (
        trust && aifignore && canTrust
        && trust.projectRoot === aifignore.projectRoot && trust.digest === aifignore.projectDigest
        && !recordProjectTrust({ projectRoot: trust.projectRoot, digest: trust.digest })
      ) {
        console.error('WARN: Could not record trust in the project .aifignore; it will be asked again.');
      }
      const reason = `Privacy: one-time ${result.operation} of ${displayPath(path.basename(result.filePath))} approved in chat`;
      if (result.suspicious) {
        console.error(`WARN: Approved path is outside the project: ${displayPath(result.filePath)}`);
      }
      const output = buildApprovedOutput({ runtime, updatedInput, reason });
      const notice = projectSkipNotice(result);
      if (notice) {
        if (runtime === 'claude-code') output.systemMessage = notice;
        console.error(`NOTE: ${notice}`);
      }
      process.stdout.write(`${JSON.stringify(output)}\n`);
      timer.end({
        tool: toolName,
        status: 'ok',
        exit: 0,
        target,
        note: result.suspicious ? 'approved-once-suspicious-path' : 'approved-once',
      });
      process.exit(0);
    }
    const exitCode = blockToolUse(
      'PRIVACY BLOCK: The approval for this access was already used, has expired, or could not be applied.\n'
      + '  Ask the user again before retrying, or continue without this file.',
      { runtime }
    );
    timer.end({ tool: toolName, status: 'block', exit: exitCode, target, note: 'approval-not-applicable' });
    process.exit(exitCode);
  }

  if (result.blocked && result.uninspectable) {
    const exitCode = blockToolUse(
      `PRIVACY BLOCK: ${result.reason}.\n`
      + '  Run the command in plain, readable form instead, so the privacy check can see which files it uses.',
      { runtime }
    );
    timer.end({ tool: toolName, status: 'block', exit: exitCode, note: 'uninspectable-command' });
    process.exit(exitCode);
  }

  if (result.blocked) {
    const projectIgnoreTrust = result.projectIgnoreTrust
      ? { projectRoot: result.projectIgnoreTrust.projectRoot, digest: result.projectIgnoreTrust.digest }
      : undefined;
    const retryAvailable = Boolean(sessionId)
      && result.accesses.every(access => recordGrant(directory, { ...grantFor(access), projectIgnoreTrust }));
    const exitCode = blockToolUse(formatBlockMessage({ result, runtime, retryAvailable }), { runtime });
    timer.end({
      tool: toolName,
      status: 'block',
      exit: exitCode,
      target,
      note: retryAvailable ? 'approval-required' : 'approval-unavailable',
    });
    process.exit(exitCode);
  }

  const notice = projectSkipNotice(result);
  if (notice) {
    if (runtime === 'claude-code') process.stdout.write(`${JSON.stringify({ systemMessage: notice })}\n`);
    console.error(`NOTE: ${notice}`);
    timer.end({ tool: toolName, status: 'ok', exit: 0, note: 'project-aifignore' });
    process.exit(0);
  }

  timer.end({ tool: toolName, status: 'ok', exit: 0 });
  process.exit(0); // Allow
}

if (require.main === module) {
  main().catch((error) => {
    try {
      const { logHookCrash } = require('./lib/hook-logger.cjs');
      logHookCrash('privacy-block', error, { event: 'PreToolUse' });
    } catch (_) { /* logging is best effort */ }
    process.exit(0); // fail-open on an internal crash, as before
  });
}
