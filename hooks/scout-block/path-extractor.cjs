#!/usr/bin/env node
/**
 * path-extractor.cjs - Extract paths from Claude Code tool inputs
 *
 * Extracts file_path, path, pattern params and parses Bash commands
 * to find all path-like arguments.
 */

// Flags that indicate the following value should NOT be checked as a path
// These are "exclude" semantics - the user is explicitly skipping these paths
const EXCLUDE_FLAGS = [
  '--exclude', '--ignore', '--skip', '--prune',
  '-x',           // tar exclude shorthand
  '-path',        // find -path (used with -prune)
  '--exclude-dir' // grep --exclude-dir
];

// Filesystem commands where bare directory names (build, dist, etc.)
// should be extracted as paths. For non-fs commands (grep, echo, sed),
// only tokens that look like actual paths (contain / or extension) are extracted.
const FILESYSTEM_COMMANDS = [
  'cd', 'ls', 'cat', 'head', 'tail', 'less', 'more',
  'rm', 'cp', 'mv', 'find', 'touch', 'mkdir', 'rmdir',
  'stat', 'file', 'du', 'tree', 'chmod', 'chown', 'ln',
  'readlink', 'realpath', 'wc', 'tee', 'tar', 'zip', 'unzip',
  'open', 'code', 'vim', 'nano', 'bat', 'rsync', 'scp', 'diff'
];

// Commands whose quoted arguments are search patterns / regexes / filter
// expressions, NOT filesystem paths. A quoted arg to one of these (e.g.
// `grep -v "node_modules\|.claude"`) must never be treated as an accessed path.
const PATTERN_ARG_COMMANDS = [
  'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack',
  'sed', 'awk', 'gawk', 'jq', 'perl'
];

// Flags whose following value is a search pattern / regex / glob rather than an
// accessed path (covers `git grep -e "..."`, `git log --grep "..."`,
// `grep --include="*.js"`, etc.). Matched against the token immediately before
// a quoted string, with any trailing `=` stripped.
const PATTERN_ARG_FLAGS = [
  '-e', '-E', '-P', '-G', '-S', '--regexp', '--grep', '--include'
];

// Command wrappers to skip when resolving the governing command of a segment.
const COMMAND_WRAPPERS = ['sudo', 'env', 'nice', 'nohup', 'time', 'timeout'];

// The PowerShell dialect name scout-checker passes in (kept as a literal here:
// scout-checker requires this module, so requiring it back would be a cycle).
const POWERSHELL_DIALECT = 'powershell';

// PowerShell filesystem cmdlets and their built-in aliases, compared
// lower-cased because PowerShell resolves command names case-insensitively.
// The POSIX-named aliases PowerShell also ships (cd, ls, cat, rm, cp, mv, ...)
// are already in FILESYSTEM_COMMANDS.
const POWERSHELL_FILESYSTEM_COMMANDS = [
  'get-content', 'gc', 'type',
  'get-childitem', 'gci', 'dir',
  'set-location', 'sl', 'chdir', 'push-location', 'pushd',
  'get-item', 'gi', 'get-itemproperty', 'gp', 'test-path', 'resolve-path', 'rvpa',
  'copy-item', 'cpi', 'copy', 'move-item', 'mi', 'move',
  'remove-item', 'ri', 'del', 'erase', 'rd', 'new-item', 'ni',
  'set-content', 'sc', 'add-content', 'ac', 'out-file', 'tee-object',
  'import-csv', 'ipcsv', 'get-filehash', 'invoke-item', 'ii', 'expand-archive', 'compress-archive'
];

// PowerShell's grep: its quoted -Pattern argument is a regex, not a path.
const POWERSHELL_PATTERN_ARG_COMMANDS = ['select-string', 'sls'];
const POWERSHELL_PATTERN_ARG_FLAGS = ['-pattern'];

// `-Path:value` binds a PowerShell parameter to its value in one token.
// PowerShell also accepts an en, em, or horizontal-bar dash as the dash.
const POWERSHELL_COLON_PARAMETER = /^([-–-―][A-Za-z][\w-]*):(.+)$/;

// PowerShell parameters whose value is the path a cmdlet reads, compared
// lower-cased. In PowerShell `-path` is one of these in any case, never the
// `find -path` exclusion that EXCLUDE_FLAGS lists for POSIX commands.
const POWERSHELL_PATH_PARAMETERS = ['-path', '-literalpath', '-lp', '-pspath'];

/**
 * Lower-case a PowerShell parameter name and give it an ASCII dash.
 * @param {string} token
 * @returns {string}
 */
function powerShellParameterName(token) {
  return token.replace(/^[–-―]/, '-').replace(/:$/, '').toLowerCase();
}

/**
 * Whether `token` is a flag whose following value is excluded from access.
 * @param {string} token
 * @param {boolean} powershell
 * @returns {boolean}
 */
function isExcludeFlag(token, powershell) {
  if (powershell && POWERSHELL_PATH_PARAMETERS.includes(powerShellParameterName(token))) return false;
  return EXCLUDE_FLAGS.includes(token);
}

/**
 * Whether `token` is a PowerShell parameter that names the path to read.
 * @param {string} token
 * @param {boolean} powershell
 * @returns {boolean}
 */
function isPowerShellPathParameter(token, powershell) {
  return powershell && POWERSHELL_PATH_PARAMETERS.includes(powerShellParameterName(token));
}

/**
 * Extract all paths from a tool_input object
 * Handles: file_path, path, pattern params and command strings
 *
 * @param {Object} toolInput - The tool_input from hook JSON
 * @param {Object} [options]
 * @param {string} [options.dialect] - Shell syntax of `command`: 'posix' (default) or 'powershell'
 * @returns {string[]} Array of extracted paths
 */
function extractFromToolInput(toolInput, options = {}) {
  const paths = [];

  if (!toolInput || typeof toolInput !== 'object') {
    return paths;
  }

  // Direct path params (Read, Edit, Write, Grep, Glob tools)
  const directParams = ['file_path', 'path', 'pattern'];
  for (const param of directParams) {
    if (toolInput[param] && typeof toolInput[param] === 'string') {
      const normalized = normalizeExtractedPath(toolInput[param]);
      if (normalized) paths.push(normalized);
    }
  }

  // Extract from a shell command if present
  if (toolInput.command && typeof toolInput.command === 'string') {
    const cmdPaths = extractFromCommand(toolInput.command, options);
    paths.push(...cmdPaths);
  }

  return paths.filter(Boolean);
}

/**
 * Extract path-like segments from a Bash command string.
 *
 * Uses pipe-segment-aware command context: for filesystem commands (cd, cat, ls, rm, etc.)
 * bare blocked directory names are extracted with priority. For non-filesystem commands
 * (grep, echo, sed, etc.) only tokens that structurally look like paths are extracted,
 * preventing false positives on search terms and string arguments.
 *
 * PowerShell commands additionally recognize the filesystem cmdlets and their
 * aliases (Get-ChildItem node_modules, gc dist\app.js), Select-String's
 * -Pattern as a search term, and the `-Path:value` single-token form.
 *
 * @param {string} command - The command string
 * @param {Object} [options]
 * @param {string} [options.dialect] - 'posix' (default) or 'powershell'
 * @returns {string[]} Array of extracted paths
 */
function extractFromCommand(command, options = {}) {
  if (!command || typeof command !== 'string') {
    return [];
  }

  const powershell = options.dialect === POWERSHELL_DIALECT;
  const isFilesystemCommand = name => FILESYSTEM_COMMANDS.includes(name)
    || (powershell && POWERSHELL_FILESYSTEM_COMMANDS.includes(name));
  const isPatternArgCommand = name => PATTERN_ARG_COMMANDS.includes(name)
    || (powershell && POWERSHELL_PATTERN_ARG_COMMANDS.includes(name));
  const paths = [];

  // First, extract quoted strings (preserve spaces in real paths). A quoted
  // argument is only a path when the command actually takes a path there:
  // quoted args to filter/pattern commands (grep, sed, awk, ...) and the values
  // of pattern/exclude flags are search terms, not filesystem paths, so they
  // must not be extracted (and therefore never wrongly blocked).
  const quotedPattern = /["']([^"']+)["']/g;
  let match;
  while ((match = quotedPattern.exec(command)) !== null) {
    const content = match[1];

    // Skip sed/awk substitution expressions (s/pattern/replacement/flags)
    if (/^s[\/|@#,]/.test(content)) continue;

    const ctx = quotedArgContext(command, match.index, options);
    if (ctx.command && isPatternArgCommand(ctx.command)) continue;
    if (ctx.precededByPatternFlag) continue;

    // A quoted bare blocked dir name is a path wherever an unquoted one is:
    // as a filesystem command's operand or a PowerShell -Path value.
    const bare = content.trim();
    if (isBlockedDirName(bare) && ((ctx.command && isFilesystemCommand(ctx.command)) || ctx.precededByPathParameter)) {
      paths.push(normalizeExtractedPath(bare));
      continue;
    }

    if (looksLikePath(content)) {
      paths.push(normalizeExtractedPath(content));
    }
  }

  // Remove quoted strings for unquoted path extraction
  const withoutQuotes = command.replace(/["'][^"']*["']/g, ' ');

  // Split on whitespace and extract path-like tokens
  const tokens = withoutQuotes.split(/\s+/).filter(Boolean);

  // Track command context per pipe segment
  let commandName = null;
  let isFsCommand = false;
  let skipNextToken = false;
  let nextIsPathValue = false;
  let heredocDelimiter = null;
  let nextIsHeredocDelimiter = false;

  for (const rawToken of tokens) {
    // `-Path:node_modules` names its path in the same token as the parameter.
    const colonParameter = powershell ? rawToken.match(POWERSHELL_COLON_PARAMETER) : null;
    const token = colonParameter ? colonParameter[2] : rawToken;
    const isPathValue = nextIsPathValue || Boolean(colonParameter && isPowerShellPathParameter(colonParameter[1], powershell));
    nextIsPathValue = false;

    // A PowerShell -Path/-LiteralPath value is a path for every cmdlet.
    if (isPathValue && !isSkippableToken(token)) {
      if (isBlockedDirName(token) || looksLikePath(token)) {
        paths.push(normalizeExtractedPath(token));
      }
      continue;
    }

    // Heredoc delimiter capture (after << or <<-)
    if (nextIsHeredocDelimiter) {
      heredocDelimiter = token.replace(/^['"]/, '').replace(/['"]$/, '');
      nextIsHeredocDelimiter = false;
      continue;
    }

    // Skip heredoc body content until closing delimiter
    if (heredocDelimiter) {
      if (token === heredocDelimiter) {
        heredocDelimiter = null;
      }
      continue;
    }

    // Detect heredoc start: <<EOF, <<'EOF', <<"EOF", <<-EOF
    if (token.startsWith('<<') && token.length > 2) {
      heredocDelimiter = token.replace(/^<<-?['"]?/, '').replace(/['"]?$/, '');
      continue;
    }
    if (token === '<<' || token === '<<-') {
      nextIsHeredocDelimiter = true;
      continue;
    }

    // Skip value after exclude flags (--exclude node_modules format)
    if (skipNextToken) {
      skipNextToken = false;
      continue;
    }

    // Reset command context at command/pipe boundaries
    if (token === '&&' || token === ';' || token.startsWith('|')) {
      commandName = null;
      isFsCommand = false;
      continue;
    }

    // Skip flags and shell operators
    if (isSkippableToken(token)) {
      if (isPowerShellPathParameter(token, powershell)) {
        nextIsPathValue = true;
      } else if (isExcludeFlag(token, powershell)) {
        skipNextToken = true;
      }
      continue;
    }

    // Determine the command for this pipe segment (first non-flag token)
    if (commandName === null) {
      commandName = token.toLowerCase();
      isFsCommand = isFilesystemCommand(commandName);
      // Skip the command word itself
      if (isCommandKeyword(token) || isFsCommand) continue;
      // Non-keyword command (e.g., ./script.sh) — fall through to path check
    }

    // For filesystem commands, extract blocked dir names with priority.
    // "cd build", "ls dist", "cat node_modules/..." — "build"/"dist" are paths here.
    if (isFsCommand && isBlockedDirName(token)) {
      paths.push(normalizeExtractedPath(token));
      continue;
    }

    // Skip common non-path command words
    if (isCommandKeyword(token)) continue;

    // Unquoted sed/awk substitution or address expressions (s/pat/repl/,
    // s|pat|repl|, /pattern/cmd, ...) are structurally never real paths —
    // same skip already applied to the quoted form above. Note: unlike the
    // quoted case, an unquoted argument to a filter command is NOT exempted
    // in general, since (per the sed/file.txt test below) an unquoted
    // trailing argument is usually the real target file, not a pattern —
    // only this quoted-adjacent structural shape is unambiguous enough to
    // skip.
    if (
      commandName &&
      isPatternArgCommand(commandName) &&
      /^s[\/|@#,]/.test(token)
    ) {
      continue;
    }

    // Check if it looks like a path
    if (looksLikePath(token)) {
      paths.push(normalizeExtractedPath(token));
    }
  }

  return paths;
}

/**
 * Resolve the command context that governs a quoted string at a given index.
 *
 * Only the current pipe/compound segment is considered — the text after the
 * last &&, ||, ;, |, or newline boundary preceding the quote — so a quoted arg
 * is classified by the command it actually belongs to. On pathological quoting
 * the split can land inside an earlier quoted string and misresolve the
 * governing command; the usual outcome is a non-command token, which preserves
 * extraction rather than suppressing it.
 *
 * @param {string} command - Full command string
 * @param {number} index - Start index of the opening quote in `command`
 * @param {Object} [options]
 * @param {string} [options.dialect] - 'posix' (default) or 'powershell'
 * @returns {{ command: (string|null), precededByPatternFlag: boolean, precededByPathParameter: boolean }}
 */
function quotedArgContext(command, index, options = {}) {
  const prefix = command.slice(0, index);
  const segments = prefix.split(/&&|\|\||;|\||\n/);
  const segment = segments[segments.length - 1];
  const words = segment.trim().split(/\s+/).filter(Boolean);

  let commandName = null;
  for (const word of words) {
    if (/^\w+=/.test(word)) continue;              // env assignment (KEY=value)
    if (COMMAND_WRAPPERS.includes(word)) continue; // sudo/env/time/...
    if (word.startsWith('-')) continue;            // flags
    commandName = word.toLowerCase();
    break;
  }

  // The flag immediately before the quote (with a trailing `=` stripped so the
  // `--exclude="..."` and `--exclude "..."` forms both match).
  const powershell = options.dialect === POWERSHELL_DIALECT;
  const lastWord = words.length ? words[words.length - 1] : '';
  const normalizedFlag = lastWord.replace(/=$/, '');
  const precededByPatternFlag =
    isExcludeFlag(normalizedFlag, powershell) || PATTERN_ARG_FLAGS.includes(normalizedFlag) ||
    (powershell && POWERSHELL_PATTERN_ARG_FLAGS.includes(powerShellParameterName(normalizedFlag)));
  const precededByPathParameter = isPowerShellPathParameter(normalizedFlag, powershell);

  return { command: commandName, precededByPatternFlag, precededByPathParameter };
}

// Common blocked directory names that should be extracted even if they
// match command keywords (e.g., "build" is both a subcommand and a dir name)
// Keep in sync with DEFAULT_PATTERNS in pattern-matcher.cjs
const BLOCKED_DIR_NAMES = [
  'node_modules', '__pycache__', '.git', 'dist', 'build',
  '.next', '.nuxt', '.venv', 'venv', 'vendor', 'target', 'coverage'
];

/**
 * Check if token is exactly a blocked directory name
 * This takes priority over command keyword filtering
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isBlockedDirName(token) {
  return BLOCKED_DIR_NAMES.includes(token);
}

/**
 * Check if a string looks like a file path
 *
 * @param {string} str - String to check
 * @returns {boolean}
 */
function looksLikePath(str) {
  if (!str || str.length < 2) return false;

  // Contains path separator
  if (str.includes('/') || str.includes('\\')) return true;

  // Starts with relative path indicator
  if (str.startsWith('./') || str.startsWith('../')) return true;

  // Has file extension (likely a file)
  if (/\.\w{1,6}$/.test(str)) return true;

  // Looks like a directory path
  if (/^[a-zA-Z0-9_-]+\//.test(str)) return true;

  return false;
}

/**
 * Check if token should be skipped (flags, operators)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isSkippableToken(token) {
  // Flags
  if (token.startsWith('-')) return true;

  // Shell operators
  if (['|', '||', '&&', '>', '>>', '<', '<<', '&', ';'].includes(token)) return true;
  if (token.startsWith('|') || token.startsWith('>') || token.startsWith('<')) return true;
  if (token.startsWith('&')) return true;

  // Numeric values
  if (/^\d+$/.test(token)) return true;

  return false;
}

/**
 * Check if token is a common command keyword (not a path)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isCommandKeyword(token) {
  const keywords = [
    // Shell commands
    'echo', 'cat', 'ls', 'cd', 'rm', 'cp', 'mv', 'find', 'grep', 'head', 'tail',
    'wc', 'du', 'tree', 'touch', 'mkdir', 'rmdir', 'pwd', 'which', 'env', 'export',
    'source', 'bash', 'sh', 'zsh', 'true', 'false', 'test', 'xargs', 'tee', 'sort',
    'uniq', 'cut', 'tr', 'sed', 'awk', 'diff', 'chmod', 'chown', 'ln', 'file',

    // Package managers and their subcommands
    'npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'node',
    'run', 'build', 'test', 'lint', 'dev', 'start', 'install', 'ci', 'exec',
    'add', 'remove', 'update', 'publish', 'pack', 'init', 'create',

    // Build tools
    'tsc', 'esbuild', 'vite', 'webpack', 'rollup', 'turbo', 'nx',
    'jest', 'vitest', 'mocha', 'eslint', 'prettier',

    // Git
    'git', 'commit', 'push', 'pull', 'merge', 'rebase', 'checkout', 'branch',
    'status', 'log', 'diff', 'add', 'reset', 'stash', 'fetch', 'clone',

    // Docker
    'docker', 'compose', 'up', 'down', 'ps', 'logs', 'exec', 'container', 'image',

    // Misc
    'sudo', 'time', 'timeout', 'watch', 'make', 'cargo', 'python', 'python3', 'pip',
    'ruby', 'gem', 'go', 'rust', 'java', 'javac', 'mvn', 'gradle'
  ];

  return keywords.includes(token.toLowerCase());
}

/**
 * Normalize an extracted path
 * - Remove surrounding quotes
 * - Normalize path separators to forward slash
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizeExtractedPath(path) {
  if (!path) return '';

  let normalized = path.trim();

  // Remove surrounding quotes
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }

  // Strip shell metacharacters from edges (backticks, parens, braces)
  normalized = normalized.replace(/^[`({\[]+/, '').replace(/[`)};\]]+$/, '');

  // Normalize path separators to forward slash
  normalized = normalized.replace(/\\/g, '/');

  // Remove trailing slash for consistency
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

module.exports = {
  extractFromToolInput,
  extractFromCommand,
  quotedArgContext,
  looksLikePath,
  isSkippableToken,
  isCommandKeyword,
  isBlockedDirName,
  normalizeExtractedPath,
  BLOCKED_DIR_NAMES,
  EXCLUDE_FLAGS,
  FILESYSTEM_COMMANDS,
  PATTERN_ARG_COMMANDS,
  PATTERN_ARG_FLAGS,
  POWERSHELL_FILESYSTEM_COMMANDS,
  POWERSHELL_PATTERN_ARG_COMMANDS
};
