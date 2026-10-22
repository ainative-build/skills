#!/usr/bin/env node
/**
 * SubagentStart hook: gives a delegate the same project context as the main
 * session (plan, reports, paths, naming, rules), with report names prefixed
 * by its agent type. SubagentStart reads hookSpecificOutput.additionalContext.
 * Fails open: any error injects nothing.
 */

try {
  const fs = require('fs');
  const { isHookEnabled, loadContext } = require('./lib/config.cjs');
  const { buildSubagentContext } = require('./lib/context-builder.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');

  const HOOK_NAME = 'subagent-init';

  function main() {
    const timer = createHookTimer(HOOK_NAME, { event: 'SubagentStart' });
    const raw = fs.readFileSync(0, 'utf8').trim();
    const payload = raw ? JSON.parse(raw) : {};
    const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
    if (!isHookEnabled(HOOK_NAME, cwd)) {
      timer.end({ status: 'skip', exit: 0, note: 'disabled' });
      process.exit(0);
    }
    const agentType = payload.agent_type || payload.subagent_type || '';
    const additionalContext = buildSubagentContext(loadContext({ cwd }), {
      agentType,
      agentId: payload.agent_id,
      cwd,
    });
    process.stdout.write(`${JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext },
    })}\n`);
    timer.end({ status: 'ok', exit: 0, target: agentType, note: 'context-injected' });
    process.exit(0);
  }

  try {
    main();
  } catch (error) {
    logHookCrash(HOOK_NAME, error, { event: 'SubagentStart' });
    process.exit(0);
  }
} catch (error) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('subagent-init', error, { event: 'SubagentStart' });
  } catch (_) {}
  process.exit(0);
}
