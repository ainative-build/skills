'use strict';

/**
 * Block a hook event in the form the installed runtime honours.
 *
 * Exit code 2 with a reason on stderr is the portable block, but Codex on
 * Windows runs hook commands through `powershell.exe -Command`, which reports
 * any native exit code other than 0 or 1 as 1, and Codex fails a hook that
 * exits 1 open. Codex reads the same decision from JSON on stdout with exit 0
 * under every shell, so a Codex install blocks through stdout. Every other
 * runtime keeps the stderr reason and exit 2.
 *
 * Each function writes the block and returns the exit code the hook must end
 * with, so the caller can log it before exiting.
 */

const { readRuntimeMarker } = require('./runtime.cjs');

const EXIT_BLOCK = 2;

// Cursor reaches the hooks through cursor-adapter.cjs, which reads the same
// stdout decision and turns it into Cursor's permission JSON.
function blocksThroughStdout(runtime) {
  return runtime === 'codex' || runtime === 'cursor';
}

// JSON.stringify escapes a lone surrogate (a path cut inside an emoji) as
// \udXXX, which Codex's JSON parser rejects; the hook would then fail open.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function wellFormed(reason) {
  return String(reason).replace(LONE_SURROGATE, '\uFFFD');
}

function resolveRuntime(options) {
  return options && 'runtime' in options ? options.runtime : readRuntimeMarker();
}

/** Deny a PreToolUse call; Codex requires a non-empty reason. */
function blockToolUse(reason, options) {
  if (blocksThroughStdout(resolveRuntime(options))) {
    process.stdout.write(`${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: wellFormed(reason),
      },
    })}\n`);
    return 0;
  }
  process.stderr.write(`${reason}\n`);
  return EXIT_BLOCK;
}

/**
 * Block a UserPromptSubmit prompt. Codex shows `reason` for decision:block;
 * continue:false would stop the turn without it. Claude Code reads only
 * stderr on exit 2, so the reason goes there too.
 */
function blockPrompt(reason, options) {
  if (blocksThroughStdout(resolveRuntime(options))) {
    process.stdout.write(`${JSON.stringify({ decision: 'block', reason: wellFormed(reason) })}\n`);
    return 0;
  }
  process.stdout.write(`${JSON.stringify({ continue: false, decision: 'block', reason })}\n`);
  process.stderr.write(`${reason}\n`);
  return EXIT_BLOCK;
}

module.exports = {
  EXIT_BLOCK,
  blockPrompt,
  blockToolUse,
};
