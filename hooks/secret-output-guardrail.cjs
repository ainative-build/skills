#!/usr/bin/env node
/**
 * UserPromptSubmit hook: injects a static reminder when a prompt indicates
 * credential or secret handling. It never echoes prompt text or matched values.
 */

try {
  const fs = require('fs');
  const { isHookEnabled } = require('./lib/config.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');
  const { containsSecretKeyword } = require('./lib/secret-keywords.cjs');

  const HOOK_NAME = 'secret-output-guardrail';
  const REMINDER = [
    'Security reminder: do not print raw credentials, API keys, tokens, JWTs, private keys, or secret values into the conversation.',
    'Use [redacted], variable names, counts, or high-level status. Approval to read a sensitive file or command output does not grant permission to print raw values.',
    'If a value is needed for a machine action, pass it through a non-echoing path and report only success or failure.',
  ].join(' ');

  function readPayload() {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
  }

  function promptFromPayload(payload) {
    return String(payload?.prompt || payload?.user_prompt || '');
  }

  function outputForPrompt(prompt) {
    if (!containsSecretKeyword(prompt)) return null;
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: REMINDER,
      },
    };
  }

  function main() {
    const timer = createHookTimer(HOOK_NAME, { event: 'UserPromptSubmit' });

    if (!isHookEnabled(HOOK_NAME)) {
      timer.end({ status: 'skip', exit: 0, note: 'disabled' });
      process.exit(0);
    }

    const payload = readPayload();
    const result = outputForPrompt(promptFromPayload(payload));
    if (!result) {
      timer.end({ status: 'skip', exit: 0, note: 'skipped' });
      process.exit(0);
    }

    process.stdout.write(`${JSON.stringify(result)}\n`);
    timer.end({ status: 'ok', exit: 0, note: 'triggered' });
    process.exit(0);
  }

  if (require.main === module) {
    try {
      main();
    } catch (error) {
      logHookCrash(HOOK_NAME, error, { event: 'UserPromptSubmit' });
      process.exit(0);
    }
  }

  module.exports = {
    REMINDER,
    outputForPrompt,
    promptFromPayload,
  };
} catch (error) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('secret-output-guardrail', error, { event: 'UserPromptSubmit' });
  } catch (_) {}
  process.exit(0);
}
