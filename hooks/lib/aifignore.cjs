/**
 * aifignore.cjs - `.aifignore` path allowlist for the privacy guard
 *
 * A `.aifignore` file lists, in `.gitignore` syntax, the paths the privacy
 * guard skips. A path the rules match ("ignore") is not treated as sensitive;
 * a `!` negation protects it again. Rules are matched against the path
 * relative to the project root (the git root of the working directory), and
 * nothing is skipped outside a git repository or outside the project.
 *
 * Scopes, read in this order so later rules win:
 *   1. `<AIF_HOME>/.aifignore` (default `~/.aif/.aifignore`) - user scope, trusted
 *   2. `<project>/.aifignore`                                 - project scope
 *
 * Project files arrive with a clone, so a project rule that skips a sensitive
 * path takes effect only after the user trusts that exact file content once.
 * Trust is recorded per project root with a digest of the project files; any
 * edit to them needs a new acknowledgement. User rules need none.
 *
 * Matching reuses the scout-block `.gitignore` matcher; there is no second
 * parser. An unreadable file contributes no rules, so it never widens access.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMatcher, matchPath, parsePatterns } = require('../scout-block/pattern-matcher.cjs');
const { findGitRoot } = require('./scout-checker.cjs');

const AIFIGNORE_FILE = '.aifignore';
const TRUST_SCHEMA_VERSION = 1;
const MAX_TRUST_BYTES = 4096;
const MAX_IGNORE_BYTES = 64 * 1024;
// A path word the shell or tool may still expand (home, variables, command
// substitution, braces, globs) names a file this check cannot see.
const UNRESOLVED_PATH = /[~$`{}[\]*?%]/;
// The OS applies a `..` segment after following links, but path.resolve
// collapses it as text, so `link/../.env` could name a file outside the project.
const PARENT_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
// A colon past a leading `C:/` names a PowerShell provider path
// (`FileSystem::../.env`), a drive-relative path or a stream, none of which
// path.resolve reads the way the shell does.
const DRIVE_PREFIX = /^[A-Za-z]:[\\/]/;
function isQualifiedPath(word) {
  return word.slice(DRIVE_PREFIX.test(word) ? 2 : 0).includes(':');
}

function aifHome(environment = process.env) {
  return path.resolve(environment.AIF_HOME || path.join(os.homedir(), '.aif'));
}

function trustDirectory(environment = process.env) {
  return path.join(aifHome(environment), 'state', 'aifignore-trust');
}

function trustFilePath(directory, projectRoot) {
  const key = crypto.createHash('sha256').update(projectRoot).digest('hex');
  return path.join(directory, `${key}.json`);
}

/**
 * Read an ignore file only when it is a small regular file. A symlink, device
 * or oversized file adds no rules: a file a clone controls must never be able
 * to stall the hook, because a hook that never answers lets the tool run.
 */
function readSource(filePath) {
  try {
    const info = fs.lstatSync(filePath);
    if (!info.isFile() || info.size > MAX_IGNORE_BYTES) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    if (Buffer.byteLength(content) > MAX_IGNORE_BYTES) return null;
    return { path: filePath, content, patterns: parsePatterns(content) };
  } catch {
    return null;
  }
}

/**
 * Resolve symlinks in a path that may not exist yet: the deepest existing
 * ancestor is resolved and the rest appended, so a link inside the project
 * cannot make an outside file look like a project path.
 */
function realPath(target) {
  let existing = target;
  const rest = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(existing), ...rest);
    } catch {
      const parent = path.dirname(existing);
      if (parent === existing) return target;
      rest.unshift(path.basename(existing));
      existing = parent;
    }
  }
}

/**
 * Digest of the project files' names and content, so trust follows the exact
 * rules the user acknowledged.
 */
function projectDigest(projectRoot, sources) {
  const entries = sources.map(source => [path.relative(projectRoot, source.path), source.content]);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function readTrust(filePath) {
  try {
    const info = fs.lstatSync(filePath);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_TRUST_BYTES) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load the `.aifignore` rules that apply to a working directory.
 *
 * @param {Object} [options]
 * @param {string} [options.cwd] - Directory the tool paths are relative to
 * @param {Object} [options.environment] - Environment carrying AIF_HOME
 * @returns {{
 *   projectRoot: string,
 *   projectFiles: string[],
 *   projectPatterns: string[],
 *   projectDigest: string|null,
 *   projectTrusted: boolean,
 *   allowedBy: (filePath: string) => 'user'|'project'|null
 * }}
 */
function loadAifignore({ cwd = process.cwd(), environment = process.env } = {}) {
  const resolvedCwd = path.resolve(cwd);
  const gitRoot = findGitRoot(resolvedCwd);
  const projectRoot = realPath(gitRoot || resolvedCwd);
  const userSource = readSource(path.join(aifHome(environment), AIFIGNORE_FILE));
  const projectSources = [path.join(projectRoot, AIFIGNORE_FILE)].map(readSource).filter(Boolean);

  const userPatterns = userSource ? userSource.patterns : [];
  const projectPatterns = projectSources.flatMap(source => source.patterns);
  const digest = projectSources.length > 0 ? projectDigest(projectRoot, projectSources) : null;
  const trust = digest ? readTrust(trustFilePath(trustDirectory(environment), projectRoot)) : null;
  const projectTrusted = Boolean(
    trust && trust.schemaVersion === TRUST_SCHEMA_VERSION &&
    trust.projectRoot === projectRoot && trust.digest === digest
  );

  const userMatcher = userPatterns.length > 0 ? createMatcher(userPatterns) : null;
  const combinedMatcher = projectPatterns.length > 0 ? createMatcher([...userPatterns, ...projectPatterns]) : userMatcher;

  /**
   * Which scope skips the path, or null when it stays protected. A project
   * negation can re-protect a path the user scope skips; it can never skip
   * one on the user's behalf, so a skip needs the combined rules to agree.
   */
  function allowedBy(filePath) {
    const word = String(filePath || '');
    if (!gitRoot || !combinedMatcher || !word || UNRESOLVED_PATH.test(word) || PARENT_SEGMENT.test(word) || isQualifiedPath(word)) return null;
    const relative = path.relative(projectRoot, realPath(path.resolve(resolvedCwd, word)));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    const projectPath = relative.split(path.sep).join('/');
    if (!matchPath(combinedMatcher, projectPath).blocked) return null;
    return userMatcher && matchPath(userMatcher, projectPath).blocked ? 'user' : 'project';
  }

  return {
    projectRoot,
    projectFiles: projectSources.map(source => source.path),
    projectPatterns,
    projectDigest: digest,
    projectTrusted,
    allowedBy,
  };
}

/**
 * Record that the user trusts the project `.aifignore` content with this
 * digest. Returns false when the record could not be written.
 */
function recordProjectTrust({ projectRoot, digest, environment = process.env, now = Date.now() }) {
  if (!projectRoot || !digest) return false;
  try {
    const directory = trustDirectory(environment);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const target = trustFilePath(directory, projectRoot);
    const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    const value = { schemaVersion: TRUST_SCHEMA_VERSION, projectRoot, digest, trustedAt: now };
    fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, target);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  AIFIGNORE_FILE,
  aifHome,
  loadAifignore,
  recordProjectTrust,
};
