#!/usr/bin/env node
/**
 * scout-block.cjs - Cross-platform hook for blocking directory access
 *
 * Blocks access to the built-in heavy directories (node_modules, dist, build,
 * .git and similar) plus any listed in an optional .scoutignore at the git root.
 * Uses gitignore-spec compliant pattern matching via 'ignore' package
 *
 * Blocking Rules:
 * - File paths: Blocks any file_path/path/pattern containing blocked directories
 * - Bash commands: Blocks directory access (cd, ls, cat, etc.) but ALLOWS build commands
 *   - Blocked: cd node_modules, ls packages/web/node_modules, cat dist/file.js
 *   - Allowed: npm build, go build, cargo build, make, mvn, gradle, docker build, kubectl, terraform
 *
 * Configuration:
 * - Add <project-root>/.scoutignore to block more paths for one project
 * - Turn the hook off with `hooks.scout-block: false` in .aif/config.json
 * - Supports negation patterns (!) to allow specific paths
 *
 * Exit Codes:
 * - 0: Command allowed
 * - 2: Command blocked
 *
 * Core logic extracted to lib/scout-checker.cjs for OpenCode plugin reuse.
 */

// Crash wrapper — catches require() failures and logs them
try {
  const fs = require('fs');
  // Import shared scout checking logic
  const {
    checkScoutBlock,
    isBuildCommand,
    isVenvExecutable,
    isAllowedCommand
  } = require('./lib/scout-checker.cjs');
  const { isHookEnabled } = require('./lib/config.cjs');

  // Early exit if hook disabled in config
  if (!isHookEnabled('scout-block')) {
    process.exit(0);
  }

  // Import formatters (kept local as they're Claude-specific output)
  const { formatBlockedError } = require('./scout-block/error-formatter.cjs');
  const { formatBroadPatternError } = require('./scout-block/broad-pattern-detector.cjs');

  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');
  const { blockToolUse } = require('./lib/hook-block.cjs');

  try {
    const timer = createHookTimer('scout-block', { event: 'PreToolUse' });
    // Read stdin synchronously
    const hookInput = fs.readFileSync(0, 'utf-8');

    // Validate input not empty
    if (!hookInput || hookInput.trim().length === 0) {
      const exitCode = blockToolUse('ERROR: Empty input');
      timer.end({ status: 'error', exit: exitCode, note: 'empty-input' });
      process.exit(exitCode);
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(hookInput);
    } catch (parseError) {
      // Fail-open for unparseable input
      console.error('WARN: JSON parse failed, allowing operation');
      timer.end({ status: 'warn', exit: 0, note: 'json-parse-failed', error: parseError.message });
      process.exit(0);
    }

    // Validate structure
    if (!data.tool_input || typeof data.tool_input !== 'object') {
      // Fail-open for invalid structure
      console.error('WARN: Invalid JSON structure, allowing operation');
      timer.end({ status: 'warn', exit: 0, note: 'invalid-structure' });
      process.exit(0);
    }

    const toolInput = data.tool_input;
    const toolName = data.tool_name || 'unknown';
    const payloadCwd = typeof data.cwd === 'string' && data.cwd.trim()
      ? data.cwd
      : process.cwd();

    // Use shared scout checker
    const result = checkScoutBlock({
      toolName,
      toolInput,
      options: {
        cwd: payloadCwd,
        checkBroadPatterns: true
      }
    });

    // Handle allowed commands
    if (result.isAllowedCommand) {
      timer.end({ tool: toolName, status: 'ok', exit: 0, note: 'allowed-command' });
      process.exit(0);
    }

    // Handle broad pattern blocks
    if (result.blocked && result.isBroadPattern) {
      const errorMsg = formatBroadPatternError({
        blocked: true,
        reason: result.reason,
        suggestions: result.suggestions
      });
      const exitCode = blockToolUse(errorMsg);
      timer.end({
        tool: toolName,
        status: 'block',
        exit: exitCode,
        target: result.pattern || toolInput.path || toolInput.file_path || '',
        note: result.reason || 'broad-pattern'
      });
      process.exit(exitCode);
    }

    // Handle pattern blocks
    if (result.blocked) {
      const errorMsg = formatBlockedError({
        path: result.path,
        pattern: result.pattern,
        tool: toolName,
        configPath: result.configPath
      });
      const exitCode = blockToolUse(errorMsg);
      timer.end({
        tool: toolName,
        status: 'block',
        exit: exitCode,
        target: result.path || '',
        note: result.pattern || 'blocked-path'
      });
      process.exit(exitCode);
    }

    // All paths allowed
    timer.end({ tool: toolName, status: 'ok', exit: 0 });
    process.exit(0);

  } catch (error) {
    // Fail-open for unexpected errors
    console.error('WARN: Hook error, allowing operation -', error.message);
    logHookCrash('scout-block', error, { event: 'PreToolUse' });
    process.exit(0);
  }
} catch (e) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('scout-block', e, { event: 'PreToolUse' });
  } catch (_) {}
  process.exit(0); // fail-open
}
