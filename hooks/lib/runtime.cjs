'use strict';

/**
 * Which runtime is running the hooks, and the session and path normalization
 * the privacy grant store keys on.
 *
 * An install may write `hooks/.runtime.json` ({"schemaVersion":1,
 * "runtime":"codex"}). Without it, AIF_RUNTIME names the runtime, and a
 * Claude Code plugin install is recognised by the variables Claude Code sets
 * for hook commands. The runtime picks how a hook blocks and how an approved
 * privacy retry is expressed, so an unknown runtime falls back to the
 * portable behaviour rather than guessing.
 */

const fs = require('fs');
const path = require('path');

const MAX_SESSION_ID_LENGTH = 200;
const SAFE_SESSION_ID_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const RUNTIME_MARKER_MAX_BYTES = 4096;
const RUNTIME_MARKER_FILE = '.runtime.json';
const SUPPORTED_RUNTIMES = new Set(['claude-code', 'codex', 'cursor']);

function normalizeSessionId(sessionId) {
  if (typeof sessionId !== 'string') return null;
  const normalized = sessionId.trim();
  if (!normalized || normalized.length > MAX_SESSION_ID_LENGTH) return null;
  if (normalized === '.' || normalized === '..') return null;
  return SAFE_SESSION_ID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeProjectPath(value, platform = process.platform) {
  let normalized = path.normalize(value);
  if (platform === 'win32') {
    normalized = normalized.replace(/\\/g, '/').toLowerCase();
  }
  return normalized;
}

function defaultRuntimeMarkerPath() {
  return path.join(__dirname, '..', RUNTIME_MARKER_FILE);
}

function readMarkerFile(markerPath) {
  try {
    const info = fs.lstatSync(markerPath);
    if (!info.isFile() || info.isSymbolicLink() || info.size > RUNTIME_MARKER_MAX_BYTES) return null;
    const parsed = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (parsed?.schemaVersion !== 1 || !SUPPORTED_RUNTIMES.has(parsed.runtime)) return null;
    return parsed.runtime;
  } catch {
    return null;
  }
}

/**
 * The runtime id, or null when it cannot be told.
 *
 * @param {string} [markerPath] - Marker file to read first
 * @param {object} [environment]
 * @returns {string|null}
 */
function readRuntimeMarker(markerPath = defaultRuntimeMarkerPath(), environment = process.env) {
  const marked = readMarkerFile(markerPath);
  if (marked) return marked;
  if (SUPPORTED_RUNTIMES.has(environment.AIF_RUNTIME)) return environment.AIF_RUNTIME;
  if (environment.CLAUDE_PROJECT_DIR || environment.CLAUDE_PLUGIN_ROOT) return 'claude-code';
  return null;
}

module.exports = {
  RUNTIME_MARKER_FILE,
  SUPPORTED_RUNTIMES,
  normalizeProjectPath,
  normalizeSessionId,
  readRuntimeMarker,
};
