#!/usr/bin/env node
/**
 * UserPromptSubmit hook: re-injects the development rules, the active plan and
 * the naming pattern so they stay in view through a long session.
 *
 * The rules come from rules/development-rules.md beside the hooks, or from
 * AIF_RULES_DIR. To keep the cost down, one session and project gets the
 * reminder at most once every five minutes; the timestamp lives in
 * ~/.aif/state/reminders/. Fails open: any error injects nothing.
 */

try {
  const crypto = require('crypto');
  const fs = require('fs');
  const path = require('path');
  const { aifHome, isHookEnabled, loadContext } = require('./lib/config.cjs');
  const { buildReminderContext } = require('./lib/context-builder.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');
  const { normalizeSessionId } = require('./lib/runtime.cjs');

  const HOOK_NAME = 'dev-rules-reminder';
  const REMIND_INTERVAL_MS = 5 * 60 * 1000;

  function stampPath(sessionId, root) {
    const key = crypto.createHash('sha256').update(JSON.stringify([sessionId, root])).digest('hex');
    return path.join(aifHome(), 'state', 'reminders', `${key}.json`);
  }

  // Without a session id every prompt gets the reminder: nothing to key on.
  function recentlyReminded(file, now) {
    if (!file) return false;
    try {
      return now - fs.statSync(file).mtimeMs < REMIND_INTERVAL_MS;
    } catch {
      return false;
    }
  }

  function markReminded(file) {
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file, '{}', { mode: 0o600 });
    } catch { /* a missed stamp only means an extra reminder */ }
  }

  function main() {
    const timer = createHookTimer(HOOK_NAME, { event: 'UserPromptSubmit' });
    const raw = fs.readFileSync(0, 'utf8').trim();
    const payload = raw ? JSON.parse(raw) : {};
    const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
    if (!isHookEnabled(HOOK_NAME, cwd)) {
      timer.end({ status: 'skip', exit: 0, note: 'disabled' });
      process.exit(0);
    }
    const ctx = loadContext({ cwd });
    const sessionId = normalizeSessionId(payload.session_id);
    const stamp = sessionId ? stampPath(sessionId, ctx.root) : null;
    if (recentlyReminded(stamp, Date.now())) {
      timer.end({ status: 'skip', exit: 0, note: 'recently-injected' });
      process.exit(0);
    }
    process.stdout.write(`${JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: buildReminderContext(ctx) },
    })}\n`);
    markReminded(stamp);
    timer.end({ status: 'ok', exit: 0, note: 'context-injected' });
    process.exit(0);
  }

  try {
    main();
  } catch (error) {
    logHookCrash(HOOK_NAME, error, { event: 'UserPromptSubmit' });
    process.exit(0);
  }
} catch (error) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('dev-rules-reminder', error, { event: 'UserPromptSubmit' });
  } catch (_) {}
  process.exit(0);
}
