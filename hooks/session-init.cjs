#!/usr/bin/env node
/**
 * SessionStart hook: prints the project context (plans, reports and docs
 * directories, active plan, naming pattern, language, rules) as plain stdout,
 * which the runtime adds to the session. Fails open: any error prints nothing.
 */

try {
  const fs = require('fs');
  const { isHookEnabled, loadContext } = require('./lib/config.cjs');
  const { buildSessionContext } = require('./lib/context-builder.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');

  const HOOK_NAME = 'session-init';

  function readPayload() {
    try {
      const raw = fs.readFileSync(0, 'utf8').trim();
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function main() {
    const timer = createHookTimer(HOOK_NAME, { event: 'SessionStart' });
    const payload = readPayload();
    const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
    if (!isHookEnabled(HOOK_NAME, cwd)) {
      timer.end({ status: 'skip', exit: 0, note: 'disabled' });
      process.exit(0);
    }
    process.stdout.write(`${buildSessionContext(loadContext({ cwd }))}\n`);
    timer.end({ status: 'ok', exit: 0, note: 'context-injected' });
    process.exit(0);
  }

  try {
    main();
  } catch (error) {
    logHookCrash(HOOK_NAME, error, { event: 'SessionStart' });
    process.exit(0);
  }
} catch (error) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('session-init', error, { event: 'SessionStart' });
  } catch (_) {}
  process.exit(0);
}
