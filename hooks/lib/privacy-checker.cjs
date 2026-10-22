#!/usr/bin/env node
/**
 * privacy-checker.cjs - Privacy pattern matching logic for sensitive file detection
 *
 * Extracted from privacy-block.cjs for reuse in both Claude hooks and OpenCode plugins.
 * Pure logic module - no stdin/stdout, no exit codes.
 *
 * @module privacy-checker
 */

const path = require('path');
const { isHookEnabled } = require('./config.cjs');
const {
  SHELL_DIALECT_POSIX,
  SHELL_DIALECT_POWERSHELL,
  decodePowerShellEncodedCommand,
  findPowerShellEncodedCommand,
  isPowerShellHost,
  normalizeShellCommand,
  shellDialect,
  shellEscapeChar,
  splitCompoundCommand,
} = require('./scout-checker.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const APPROVED_PREFIX = 'APPROVED:';
const DENO_EVAL_OPTIONS_WITH_VALUES = new Set([
  '-c',
  '-L',
  '--cert',
  '--config',
  '--env-file',
  '--ext',
  '--import-map',
  '--location',
  '--log-level',
  '--seed',
  '--v8-flags',
]);

// Safe file patterns - exempt from privacy checks (documentation/template files)
const SAFE_PATTERNS = [
  /\.example$/i,   // .env.example, config.example
  /\.sample$/i,    // .env.sample
  /\.template$/i,  // .env.template
];

// Privacy-sensitive patterns
const PRIVACY_PATTERNS = [
  /^\.env$/,              // .env
  /^\.env\./,             // .env.local, .env.production, etc.
  /\.env$/,               // path/to/.env
  /\/\.env\./,            // path/to/.env.local
  /credentials/i,         // credentials.json, etc.
  /secrets?\.ya?ml$/i,    // secrets.yaml, secret.yml
  /\.pem$/,               // Private keys
  /\.key$/,               // Private keys
  /id_rsa/,               // SSH keys
  /id_ed25519/,           // SSH keys
];

// A command whose paths `.aifignore` may skip: one program that only reads
// the files named as its operands, with arguments only, so every path is read
// relative to the hook's working directory. Operators, redirection, grouping,
// substitution and PowerShell's comma lists are refused, because a command
// could then move (`cd ..`), link (`ln -s .. up`), run another program or name
// more files than the check sees. Programs that take globs, directories or
// file lists (`grep -r`, `rg -g`, `diff`) are left out for the same reason,
// and so is any argument with a wildcard or a `..` segment: a filter such as
// `gc ../* -Include .env` reads files the sensitive-path check never sees.
// Anything else keeps the guard's default.
const SIMPLE_READ_COMMAND = /^\s*(?:cat|head|tail|less|more|wc|cut|bat|type|get-content|gc)(?:[ \t](?!(?:.*[\s\\/'":=])?\.\.(?:[\s\\/'"]|$))[^;&|<>()`$\r\n{},*?[\]]*)?$/i;

// Names a dotenv glob is tested against: a glob that matches one of them
// (`.e*`, `.en?`, `.[e]nv`) names those files once the shell expands it.
const DOTENV_GLOB_PROBES = ['.env', '.env.local'];

// PowerShell operators whose right operand is a regex matched against a
// string, never a path the shell opens. `-like` is left out: its wildcard
// operand selects file names the way a path does.
const POWERSHELL_PATTERN_OPERATOR = /^-[ci]?(?:not)?(?:match|replace|split)$|^-pattern$/i;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drop an NTFS alternate data stream suffix from a file name: `.env::$DATA`
 * and `.env:stream` open the stream of `.env` on Windows.
 * @param {string} basename
 * @returns {string}
 */
function stripNtfsStream(basename) {
  const colon = basename.indexOf(':');
  return colon > 0 ? basename.slice(0, colon) : basename;
}

/**
 * Whether a file name is a Windows 8.3 short name of a dotenv file. Windows
 * drops the leading dot, so `.env` is `ENV~1` and `.env.local` is `ENVLOC~1`.
 * @param {string} basename
 * @returns {boolean}
 */
function isDotenvShortName(basename) {
  return /^env[^~./]{0,3}~\d+(?:\.[^./]{0,3})?$/i.test(basename);
}

/**
 * Whether a dot-leading glob file name can match a dotenv file.
 * @param {string} basename
 * @returns {boolean}
 */
function isDotenvGlob(basename) {
  if (!basename.startsWith('.') || !/[*?[]/.test(basename)) return false;
  const tokens = globTokens(basename.toLowerCase());
  return DOTENV_GLOB_PROBES.some(name => globTokensMatch(tokens, name));
}

/**
 * Split a glob into literal characters, `?`, `*` and bracket classes. An
 * unterminated `[` is a literal, as the shell treats it.
 * @param {string} glob
 * @returns {Array<{kind: string, char?: string, test?: (c: string) => boolean}>}
 */
function globTokens(glob) {
  const tokens = [];
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    const close = char === '[' ? glob.indexOf(']', index + 2) : -1;
    if (char === '*') {
      if (tokens.at(-1)?.kind !== 'star') tokens.push({ kind: 'star' });
    } else if (char === '?') {
      tokens.push({ kind: 'any' });
    } else if (close > 0) {
      let body = glob.slice(index + 1, close);
      const negated = body[0] === '!' || body[0] === '^';
      if (negated) body = body.slice(1);
      tokens.push({ kind: 'class', test: c => classIncludes(body, c) !== negated });
      index = close;
    } else {
      tokens.push({ kind: 'char', char });
    }
  }
  return tokens;
}

function classIncludes(body, char) {
  for (let index = 0; index < body.length; index++) {
    if (body[index + 1] === '-' && index + 2 < body.length) {
      if (char >= body[index] && char <= body[index + 2]) return true;
      index += 2;
    } else if (body[index] === char) {
      return true;
    }
  }
  return false;
}

/**
 * Match glob tokens against a name in linear passes: a failed match resumes
 * after the last star instead of retrying every split, so no pattern can
 * make the check slow.
 * @param {ReturnType<typeof globTokens>} tokens
 * @param {string} name
 * @returns {boolean}
 */
function globTokensMatch(tokens, name) {
  let t = 0;
  let n = 0;
  let starToken = -1;
  let starName = 0;
  while (n < name.length) {
    const token = tokens[t];
    if (token?.kind === 'star') {
      starToken = t++;
      starName = n;
    } else if (token && (token.kind === 'any' || (token.kind === 'char' ? token.char === name[n] : token.test(name[n])))) {
      t++;
      n++;
    } else if (starToken >= 0) {
      t = starToken + 1;
      n = ++starName;
    } else {
      return false;
    }
  }
  while (tokens[t]?.kind === 'star') t++;
  return t === tokens.length;
}

/**
 * Whether a command word names a dotenv file by an alias that does not spell
 * `.env`: a dot-leading glob or a Windows short name.
 * @param {string} value
 * @returns {boolean}
 */
function isDotenvAlias(value, options = {}) {
  const rawBasename = path.basename(String(value).replace(/\\/g, '/'));
  return [rawBasename, stripNtfsStream(rawBasename)].some(basename =>
    (options.glob !== false && isDotenvGlob(basename)) || (options.shortName !== false && isDotenvShortName(basename)));
}

/**
 * Check if path is a safe file (example/sample/template)
 * @param {string} testPath - Path to check
 * @returns {boolean} true if file matches safe patterns
 */
function isSafeFile(testPath) {
  if (!testPath) return false;
  const basename = path.basename(testPath);
  return SAFE_PATTERNS.some(p => p.test(basename));
}

/**
 * Check if path has APPROVED: prefix
 * @param {string} testPath - Path to check
 * @returns {boolean} true if path starts with APPROVED:
 */
function hasApprovalPrefix(testPath) {
  return typeof testPath === 'string' && testPath.startsWith(APPROVED_PREFIX);
}

/**
 * Strip APPROVED: prefix from path
 * @param {string} testPath - Path to process
 * @returns {string} Path without APPROVED: prefix
 */
function stripApprovalPrefix(testPath) {
  if (hasApprovalPrefix(testPath)) {
    return testPath.slice(APPROVED_PREFIX.length);
  }
  return testPath;
}

/**
 * Check if stripped path is suspicious (path traversal or absolute)
 * @param {string} strippedPath - Path after stripping APPROVED: prefix
 * @returns {boolean} true if path looks suspicious
 */
function isSuspiciousPath(strippedPath) {
  return strippedPath.includes('..') || path.isAbsolute(strippedPath);
}

/**
 * Check if path matches privacy patterns
 * @param {string} testPath - Path to check
 * @param {Object} [options]
 * @param {boolean} [options.ignoreCase] - Match in any letter case, as a
 *   Windows filesystem resolves names (`.ENV` opens `.env`)
 * @returns {boolean} true if path matches privacy-sensitive patterns
 */
function isPrivacySensitive(testPath, options = {}) {
  if (!testPath) return false;

  // Strip prefix for pattern matching
  const cleanPath = stripApprovalPrefix(testPath);
  let normalized = cleanPath.replace(/\\/g, '/');
  if (options.ignoreCase) normalized = normalized.toLowerCase();

  // Decode URI components to catch obfuscated paths (%2e = '.')
  try {
    normalized = decodeURIComponent(normalized);
  } catch (e) {
    // Invalid encoding, use as-is
  }

  // Windows opens a file through its alternate data stream spelling too
  // (`.env::$DATA`), while `HEAD:.env` and `host:.env` name the file after
  // the colon, so both spellings are checked.
  const rawBasename = path.basename(normalized);
  const spellings = [normalized];
  const streamBasename = stripNtfsStream(rawBasename);
  if (streamBasename !== rawBasename) {
    spellings.push(normalized.slice(0, normalized.length - rawBasename.length) + streamBasename);
    spellings.push(rawBasename.slice(rawBasename.lastIndexOf(':') + 1));
  }
  return spellings.some(spelling => matchesPrivacyPatterns(spelling, options));
}

function matchesPrivacyPatterns(normalized, options) {
  const basename = path.basename(normalized);
  // Check safe patterns first - exempt example/sample/template files
  if (isSafeFile(normalized)) {
    return false;
  }

  if (isDotenvAlias(basename, { glob: options.glob === true, shortName: options.shortName !== false })) return true;

  for (const pattern of PRIVACY_PATTERNS) {
    if (pattern.test(basename) || pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Lex one shell command segment into quote-aware words with source spans.
 * Operators that attach file operands are delimiters, never part of a path.
 * PowerShell escapes with a backtick (a backslash is a path separator there)
 * and also ends a word at script-block braces and the array comma.
 * @param {string} command - One executable command segment
 * @param {string} [dialect] - 'posix' (default) or 'powershell'
 * @returns {Array<{value: string, start: number, end: number, unquotedGlob: boolean}>}
 */
function lexShellWords(command, dialect) {
  const escape = shellEscapeChar(dialect);
  const powershell = dialect === SHELL_DIALECT_POWERSHELL;
  const delimiters = powershell ? '<>(){},' : '<>()';
  const words = [];
  let value = '';
  let start = -1;
  let quote = null;
  // A shell expands only the glob characters it sees unquoted.
  let unquotedGlob = false;

  const flush = end => {
    if (start >= 0) words.push({ value, start, end, unquotedGlob });
    value = '';
    start = -1;
    unquotedGlob = false;
  };

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (quote) {
      if (char === escape && quote === '"' && index + 1 < command.length) {
        value += command[++index];
      } else if (powershell && char === quote && command[index + 1] === quote) {
        // PowerShell doubles a quote to put it inside a string of that quote.
        value += command[++index];
      } else if (char === quote) {
        quote = null;
      } else {
        value += char;
      }
      continue;
    }
    if (/\s/.test(char) || delimiters.includes(char)) {
      flush(index);
      continue;
    }
    if (char === '"' || char === "'") {
      if (start < 0) start = index;
      quote = char;
      continue;
    }
    if (char === escape && index + 1 < command.length) {
      if (start < 0) start = index;
      value += command[++index];
      continue;
    }
    if (start < 0) start = index;
    if ('*?['.includes(char)) unquotedGlob = true;
    value += char;
  }
  flush(command.length);
  return words;
}

function findEnvSplitString(words) {
  let executableIndex = 0;
  while (words[executableIndex] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[executableIndex].value)) {
    executableIndex++;
  }
  const executable = path.basename((words[executableIndex]?.value || '').replace(/\\/g, '/'));
  if (executable !== 'env') return null;

  for (let index = executableIndex + 1; index < words.length; index++) {
    const option = words[index].value;
    const inline = option.match(/^(?:-S|--split-string=)(.+)$/);
    if (inline) return { index, value: inline[1] };
    if (/^(?:-S|--split-string)$/.test(option)) {
      return words[index + 1] ? { index: index + 1, value: words[index + 1].value } : null;
    }
    if (/^(?:-u|-C|--unset|--chdir)$/.test(option)) {
      index++;
      continue;
    }
    if (
      option.startsWith('-')
      || /^[A-Za-z_][A-Za-z0-9_]*=/.test(option)
    ) {
      continue;
    }
    break;
  }
  return null;
}

/**
 * Resolve only the exact source argument owned by a node/bun/deno evaluator.
 * @param {Array<{value: string}>} words - Lexed command words
 * @returns {{index: number, value: string}|null}
 */
function findEvaluatorSource(words) {
  const splitString = findEnvSplitString(words);
  if (splitString) return { index: splitString.index, value: '`' };
  let executableIndex = 0;
  while (words[executableIndex] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[executableIndex].value)) {
    executableIndex++;
  }
  if (path.basename((words[executableIndex]?.value || '').replace(/\\/g, '/')) === 'env') {
    executableIndex++;
    while (words[executableIndex]) {
      const option = words[executableIndex].value;
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(option) || /^--(?:unset|chdir)=/.test(option)) {
        executableIndex++;
        continue;
      }
      if (/^(?:-u|-C|--unset|--chdir)$/.test(option)) {
        executableIndex += 2;
        continue;
      }
      if (option.startsWith('-')) {
        executableIndex++;
        continue;
      }
      break;
    }
  }

  const executable = path.basename((words[executableIndex]?.value || '').replace(/\\/g, '/'))
    .replace(/\.exe$/i, '');
  if (executable !== 'node' && executable !== 'bun' && executable !== 'deno') return null;
  if (executable === 'deno' && words[executableIndex + 1]?.value === 'eval') {
    let sourceIndex = executableIndex + 2;
    while (words[sourceIndex]?.value.startsWith('-')) {
      const option = words[sourceIndex].value;
      if (option === '--') {
        sourceIndex++;
        break;
      }
      sourceIndex += DENO_EVAL_OPTIONS_WITH_VALUES.has(option) ? 2 : 1;
    }
    return words[sourceIndex] ? { index: sourceIndex, value: words[sourceIndex].value } : null;
  }

  for (let index = executableIndex + 1; index < words.length; index++) {
    const flag = words[index].value;
    const inline = flag.match(/^--(?:eval|print)=(.*)$/);
    if (inline) return { index, value: inline[1] };
    if (/^(?:-[ep]|--(?:eval|print))$/.test(flag) && words[index + 1]) {
      return { index: index + 1, value: words[index + 1].value };
    }
  }
  return null;
}

function isRuntimeEnvironmentReference(value) {
  return /^\$?(?:(?:(?:globalThis|global)\.)?process(?:\.|\?\.)env|(?:Deno|Bun)(?:\.|\?\.)env|import\.meta(?:\.|\?\.)env)(?:(?:\.|\?\.)[A-Za-z_$][\w$]*)*$/.test(value);
}

/**
 * Common evaluator quoting is inspected, but legacy backticks are deliberately
 * opaque: partially parsing them alternates between false blocks and missed
 * nested shell reads.
 */
function extractEvaluatorTokens(source) {
  if (source.includes('`')) return [];
  return (source.match(/[^\s"'`|;&<>(){}\[\],]+/g) || [])
    .filter(value => !isRuntimeEnvironmentReference(value));
}
/**
 * Extract balanced command-substitution bodies while respecting shell quotes.
 * PowerShell's `$(...)` subexpression has the same shape.
 * @param {string} command - Whole command string
 * @param {string} [dialect] - 'posix' (default) or 'powershell'
 * @returns {string[]}
 */
function extractCommandSubstitutions(command, dialect) {
  const escape = shellEscapeChar(dialect);
  const substitutions = [];
  let quote = null;

  for (let index = 0; index < command.length - 1; index++) {
    const char = command[index];
    if (char === escape && quote !== "'" && index + 1 < command.length) {
      index++;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = quote === char ? null : (quote || char);
      continue;
    }
    if (char !== '$' || command[index + 1] !== '(' || quote === "'") continue;

    const start = index + 2;
    let depth = 1;
    let innerQuote = null;
    for (let cursor = start; cursor < command.length; cursor++) {
      const inner = command[cursor];
      if (inner === escape && innerQuote !== "'" && cursor + 1 < command.length) {
        cursor++;
        continue;
      }
      if (inner === '"' || inner === "'") {
        innerQuote = innerQuote === inner ? null : (innerQuote || inner);
        continue;
      }
      if (innerQuote) continue;
      if (inner === '(') depth++;
      if (inner === ')' && --depth === 0) {
        substitutions.push(command.slice(start, cursor));
        index = cursor;
        break;
      }
    }
  }
  return substitutions;
}

/**
 * preserves newlines, while a shell treats an unquoted newline as a command
 * boundary. Balanced command substitutions are additional executable contexts.
 * @param {string} command - Whole command string
 * @param {string} [dialect] - 'posix' (default) or 'powershell'
 * @returns {string[]}
 */
function splitPrivacyCommandSegments(command, dialect) {
  const escape = shellEscapeChar(dialect);
  let normalized = '';
  let quote = null;

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (char === escape && quote !== "'" && index + 1 < command.length) {
      normalized += char + command[++index];
      continue;
    }
    if (char === '"' || char === "'") {
      quote = quote === char ? null : (quote || char);
      normalized += char;
      continue;
    }
    normalized += char === '\n' && !quote ? ';' : char;
  }

  const segments = splitCompoundCommand(normalized, dialect);
  const substitutions = [];
  for (const segment of segments) {
    for (const substitution of extractCommandSubstitutions(segment, dialect)) {
      substitutions.push(...splitPrivacyCommandSegments(substitution, dialect));
    }
    const splitString = findEnvSplitString(lexShellWords(segment, dialect));
    if (splitString) {
      // `env -S` splits its string itself, with POSIX rules, whichever shell ran env.
      substitutions.push(...splitPrivacyCommandSegments(splitString.value));
    }
  }
  return [...segments, ...substitutions];
}

// Patch envelope headers (Codex apply_patch, which also answers the Edit and
// Write matchers). Only these header lines name files; for the patch tool the
// body is file content and is never scanned, so source text such as
// process.env.API_KEY inside a hunk cannot become a fabricated path. The
// patch tool is identified by name, never by command content: any shell
// command can carry a "*** Begin Patch" line, and that must not switch off the
// shell scan.
const PATCH_TOOL_NAME = 'apply_patch';
const PATCH_HEADER_LINE = /^\*\*\* (Add File|Update File|Delete File|Move to): (.+?)\s*$/;
const PATCH_HEADER_OPERATIONS = {
  'Add File': 'write',
  'Delete File': 'write',
  'Update File': 'edit',
  'Move to': 'write',
};

/**
 * Whether the tool's `command` field is a patch envelope rather than a shell
 * command. Decided by tool name only.
 * @param {string} toolName
 * @returns {boolean}
 */
function isPatchTool(toolName) {
  return String(toolName || '').toLowerCase() === PATCH_TOOL_NAME;
}

/**
 * Extract the file paths a patch envelope touches, with the operation each
 * header performs.
 * @param {string} patch - Patch text
 * @returns {Array<{value: string, field: string, operation: string}>}
 */
function extractPatchPaths(patch) {
  const paths = [];
  for (const line of patch.split(/\r?\n/)) {
    const header = line.match(PATCH_HEADER_LINE);
    if (header) {
      paths.push({ value: header[2], field: 'command', operation: PATCH_HEADER_OPERATIONS[header[1]] });
    }
  }
  return paths;
}

/**
 * Whether the word starting at `start` is the target of an output redirection.
 * @param {string} segment - Command segment the word was lexed from
 * @param {number} start - Word start offset within the segment
 * @returns {boolean}
 */
function isRedirectTarget(segment, start) {
  return segment.slice(0, start).trimEnd().endsWith('>');
}

/**
 * Extract paths from tool input
 * @param {Object} toolInput - Tool input object with file_path, path, pattern, or command
 * @param {string} [toolName] - Tool name; only the patch tool gets headers-only parsing,
 *   and the PowerShell tool's command is lexed with PowerShell quoting and escapes
 * @returns {Array<{value: string, field: string, operation?: string, ignoreCase?: boolean}>}
 *   Extracted paths with field names. `operation` is present only when the
 *   command itself determines it (a patch header or an output redirection
 *   target). `ignoreCase` marks a path from PowerShell syntax, which names a
 *   Windows file in any letter case.
 */
function extractPaths(toolInput, toolName) {
  return analyzeToolInput(toolInput, toolName).paths;
}

// Executors that run their arguments as a command line, by the syntax the
// inner command is written in. cmd keeps a backslash literal, so its inner
// command is lexed with the PowerShell rules.
// `su -c` and `runuser -c` run their argument as a shell command line too.
const POSIX_SHELL_EXECUTORS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'ash', 'eval', 'su', 'runuser']);
const POWERSHELL_EXPRESSION_EXECUTORS = new Set(['iex', 'invoke-expression']);
const CMD_EXECUTORS = new Set(['cmd']);
// Commands that run the command after them (and their own options). `wsl`
// runs it in Linux (`wsl -e sh -c ...`, `wsl -- sh -c ...`).
const COMMAND_WRAPPERS = new Set([
  'sudo', 'doas', 'env', 'nice', 'nohup', 'time', 'timeout', 'exec', 'command', 'wsl', 'xargs',
  'start-process', '&', '.',
]);
const WRAPPER_ALIASES = new Map([['saps', 'start-process'], ['start', 'start-process']]);
// Wrapper options that take the next word as their value (`sudo -u bob`,
// `wsl -d Ubuntu`), so that value is not taken for the command the wrapper
// runs. Start-Process options are matched in any case, as PowerShell does.
const WRAPPER_VALUE_OPTIONS = new Map([
  ['sudo', new Set(['-u', '--user', '-g', '--group', '-h', '--host', '-p', '--prompt', '-C', '--close-from',
    '-D', '--chdir', '-r', '--role', '-t', '--type', '-U', '--other-user', '-R', '--chroot', '-T', '--command-timeout'])],
  ['doas', new Set(['-u', '-C'])],
  ['wsl', new Set(['-d', '--distribution', '--distribution-id', '-u', '--user', '--cd', '--shell-type'])],
  ['timeout', new Set(['-s', '--signal', '-k', '--kill-after'])],
  ['env', new Set(['-u', '--unset', '-C', '--chdir'])],
  ['nice', new Set(['-n', '--adjustment'])],
  ['xargs', new Set(['-a', '--arg-file', '-d', '--delimiter', '-E', '-I', '-L', '--max-lines', '-n', '--max-args',
    '-P', '--max-procs', '-s', '--max-chars'])],
  ['start-process', new Set(['-workingdirectory', '-verb', '-windowstyle', '-credential', '-environment',
    '-redirectstandardinput', '-redirectstandardoutput', '-redirectstandarderror'])],
]);
// PowerShell calls that turn their string argument into a script block.
const POWERSHELL_SCRIPT_TEXT_EXECUTOR = /^(?:\[(?:system\.management\.automation\.)?scriptblock\]::create|.*\.invokecommand\.(?:invokescript|newscriptblock))$/i;
// Wrappers deeper than this are not unwrapped further; the call is blocked
// instead, since what it runs can no longer be inspected.
const EXECUTOR_DEPTH_LIMIT = 8;

/**
 * The executable a command word names: basename, lower-cased, without `.exe`.
 * @param {string} word
 * @returns {string}
 */
function executableName(word) {
  return path.basename(String(word).replace(/\\/g, '/')).toLowerCase().replace(/\.exe$/, '');
}

/**
 * Trim the trailing dots and spaces Windows strips from a path, unless that
 * would leave nothing but dots (`..`) or a bare directory separator.
 * @param {string} value
 * @returns {string}
 */
function trimWindowsTrailing(value) {
  const trimmed = value.replace(/[. ]+$/, '');
  return /[^\\/.]$/.test(trimmed) ? trimmed : value;
}

/**
 * Collect the dotenv and approval-marked paths a shell command names, and the
 * reasons any part of it cannot be inspected.
 *
 * Words are checked as tokens rather than matching from every ".env" substring
 * to the next whitespace. Keeping each token intact prevents source
 * expressions such as process.env.API_KEY from becoming fabricated ".env.*"
 * file paths, while shell punctuation and quotes no longer contaminate real
 * filenames. Arguments of a shell executor (`bash -c`, `pwsh -Command`,
 * `iex`, `cmd /c`) are scanned again as commands in the executor's syntax,
 * and a `-EncodedCommand` value is decoded first.
 *
 * @param {string} command
 * @param {string} dialect
 * @param {{paths: Array<Object>, uninspectable: string[]}} result - Collector
 * @param {number} depth - Executor nesting depth of `command`
 */
function scanShellCommand(command, dialect, result, depth) {
  if (depth > EXECUTOR_DEPTH_LIMIT) {
    result.uninspectable.push('the command nests shell executors too deeply to inspect');
    return;
  }
  const powershell = dialect === SHELL_DIALECT_POWERSHELL;
  // PowerShell binds `-Path:.env` in one token and assigns with `$name=` or
  // `$env:NAME=`; POSIX shells assign with a bare `NAME=`.
  const assignmentPattern = powershell
    ? /^\$?[A-Za-z_][\w:]*=(.+)$/
    : /^[A-Za-z_][A-Za-z0-9_]*=(.+)$/;

  const source = powershell ? foldPowerShellStringConcatenation(command) : command;
  const segments = splitPrivacyCommandSegments(normalizeShellCommand(source, dialect), dialect)
    .map(segment => ({ segment, words: lexShellWords(segment, dialect) }));
  // A shell given no command argument (`sh`, `bash -s`, `iex`) runs what the
  // earlier pipeline segments print, so their command-line words are scanned
  // in that shell's syntax.
  const stdinExecutors = segments.map(({ words }) => findStdinExecutor(words.map(word => word.value)));
  const stdinDialect = stdinExecutors.find(Boolean)?.dialect;

  for (const [segmentIndex, { segment, words }] of segments.entries()) {
    const evaluatorSource = findEvaluatorSource(words);
    const values = words.map(word => word.value);
    const executor = findShellExecutor(values);

    for (let index = 0; index < words.length; index++) {
      // A command line an executor runs is checked word by word below, not
      // as one path: `bash -c 'cat .env'` reads .env, not "cat .env".
      if (
        executor && index > executor.index && /\s/.test(values[index])
        && !isRedirectTarget(segment, words[index].start)
      ) continue;
      const rawValues = evaluatorSource?.index === index
        ? extractEvaluatorTokens(evaluatorSource.value)
        : [words[index].value];

      for (const rawWord of rawValues) {
        const colonParameter = powershell ? rawWord.match(/^[-–-―][A-Za-z][\w-]*:(.+)$/) : null;
        const rawValue = colonParameter ? colonParameter[1] : rawWord;
        const assignment = rawValue.match(assignmentPattern);
        let value = assignment && !hasApprovalPrefix(rawValue) ? assignment[1] : rawValue;
        // Windows resolves names in any case and drops trailing dots and spaces.
        if (powershell) value = trimWindowsTrailing(value);
        if (!value) continue;

        // Command extraction historically covers dotenv paths plus explicitly
        // approved paths. Other sensitive filename classes remain direct-path
        // checks; do not silently broaden the shell hooks' scope here.
        // A POSIX shell expands only unquoted glob characters, and a
        // PowerShell pattern operand (`-match '.*'`) is a regex, not a path.
        // Windows short names (`ENV~1`) resolve in PowerShell and in any
        // shell running on Windows, such as Git Bash.
        const glob = powershell
          ? !POWERSHELL_PATTERN_OPERATOR.test(values[index - 1] || '')
          : evaluatorSource?.index !== index && words[index].unquotedGlob;
        const matchOptions = { ignoreCase: powershell, glob, shortName: powershell || process.platform === 'win32' };
        const isDotenvCandidate = ((powershell ? value.toLowerCase() : value).includes('.env') || isDotenvAlias(value, matchOptions))
          && (isPrivacySensitive(value, matchOptions) || isSafeFile(value));
        if (isDotenvCandidate || hasApprovalPrefix(value)) {
          const entry = { value, field: 'command' };
          if (powershell) entry.ignoreCase = true;
          if (glob) entry.glob = true;
          if (evaluatorSource?.index !== index && isRedirectTarget(segment, words[index].start)) {
            entry.operation = 'write';
          }
          result.paths.push(entry);
        }
      }
    }

    if (executor) scanExecutorArguments(values.slice(executor.index + 1), executor, result, depth);
    if (stdinDialect && !stdinExecutors[segmentIndex]) {
      for (const value of values) {
        if (/\s/.test(value)) scanShellCommand(value, stdinDialect, result, depth + 1);
      }
    }
    const scriptTextIndex = powershell ? values.findIndex(value => POWERSHELL_SCRIPT_TEXT_EXECUTOR.test(value)) : -1;
    if (scriptTextIndex >= 0) {
      for (const value of values.slice(scriptTextIndex + 1)) {
        if (/\s/.test(value)) scanShellCommand(value, SHELL_DIALECT_POWERSHELL, result, depth + 1);
      }
    }
  }
}

/**
 * Join PowerShell string literals concatenated with `+` (`'.e' + 'nv'`), so a
 * file name split across literals is checked as the name it builds. A double
 * quoted literal is joined only when it expands nothing. Strings built at run
 * time (variables, `-join`, `[char]` casts) are not resolved, nor are globs a
 * tool expands itself (`find -name`, `rg -g`), brace expansion, or PowerShell
 * wildcards without a leading dot (`gc *nv`).
 * @param {string} command
 * @returns {string}
 */
function foldPowerShellStringConcatenation(command) {
  const pair = /(?:'([^']*)'|"([^"`$]*)")\s*\+\s*(?:'([^']*)'|"([^"`$]*)")/g;
  let folded = command;
  for (let previous = ''; previous !== folded;) {
    previous = folded;
    folded = folded.replace(pair, (match, a, b, c, d) => {
      const joined = (a ?? b) + (c ?? d);
      return `'${joined.replace(/'/g, "''")}'`;
    });
  }
  return folded;
}

/**
 * The index of the command a segment runs, after variable assignments and
 * command wrappers with their options and option values.
 * @param {string[]} words
 * @returns {number}
 */
function commandWordIndex(words) {
  let index = 0;
  while (index < words.length) {
    const word = words[index];
    const wrapper = WRAPPER_ALIASES.get(executableName(word)) || executableName(word);
    if (/^\$?[A-Za-z_][\w:]*=/.test(word)) {
      index++;
    } else if (COMMAND_WRAPPERS.has(wrapper)) {
      const valueOptions = WRAPPER_VALUE_OPTIONS.get(wrapper);
      index++;
      // Options, their values, and the duration `timeout` takes.
      while (index < words.length && /^(?:[-–-―]|\d)/.test(words[index])) {
        const option = wrapper === 'start-process' ? words[index].toLowerCase() : words[index];
        // In a bundle of short options the first one that takes a value takes
        // the rest of the word (`sudo -uroot`), or the next word when it is
        // last (`sudo -iu bob`).
        const bundle = wrapper === 'start-process' ? null : /^-([A-Za-z]{2,})$/.exec(option);
        const valueAt = bundle ? [...bundle[1]].findIndex(letter => valueOptions?.has(`-${letter}`)) : -1;
        index += bundle ? (valueAt === bundle[1].length - 1 ? 2 : 1) : (valueOptions?.has(option) ? 2 : 1);
      }
    } else {
      break;
    }
  }
  return index;
}

/**
 * The shell a segment runs with no command argument, reading its commands
 * from the pipeline instead (`sh`, `bash -s`, `iex`, `pwsh -Command -`).
 * @param {string[]} words
 * @returns {{dialect: string}|null}
 */
function findStdinExecutor(words) {
  const index = commandWordIndex(words);
  if (index >= words.length) return null;
  const name = executableName(words[index]);
  if (!words.slice(index + 1).every(word => /^(?:[-–-―]|\/[A-Za-z]+$)/.test(word))) return null;
  if (POSIX_SHELL_EXECUTORS.has(name) && name !== 'eval') return { dialect: SHELL_DIALECT_POSIX };
  if (POWERSHELL_EXPRESSION_EXECUTORS.has(name) || CMD_EXECUTORS.has(name) || isPowerShellHost(name)) {
    return { dialect: SHELL_DIALECT_POWERSHELL };
  }
  return null;
}

/**
 * Find the shell executor a command segment runs, when it runs one. The
 * executor must be the command itself, after any variable assignments and
 * command wrappers (`sudo`, `env`, `nohup`, the PowerShell `&` and `.`
 * operators) with their options; an argument that merely spells `eval`
 * (`deno eval ...`) is not an executor.
 * @param {string[]} words
 * @returns {{index: number, dialect: string, powerShellHost: boolean}|null}
 */
function findShellExecutor(words) {
  const index = commandWordIndex(words);
  if (index >= words.length - 1) return null;
  const name = executableName(words[index]);
  if (POSIX_SHELL_EXECUTORS.has(name)) {
    return { index, dialect: SHELL_DIALECT_POSIX, powerShellHost: false };
  }
  if (POWERSHELL_EXPRESSION_EXECUTORS.has(name) || CMD_EXECUTORS.has(name) || isPowerShellHost(name)) {
    return { index, dialect: SHELL_DIALECT_POWERSHELL, powerShellHost: isPowerShellHost(name) };
  }
  return null;
}

/**
 * Scan what a shell executor runs. Every argument is scanned as a command in
 * the executor's syntax (an argument that is not a command line only yields
 * the words it already had). A `-EncodedCommand` value among a PowerShell
 * host's own switches is decoded first; one that cannot be decoded, or the
 * `-EncodedCommand:value` spelling, makes the command uninspectable.
 * @param {string[]} args - The words after the executor
 * @param {{dialect: string, powerShellHost: boolean}} executor
 * @param {{paths: Array<Object>, uninspectable: string[]}} result
 * @param {number} depth
 */
function scanExecutorArguments(args, executor, result, depth) {
  const { dialect: innerDialect, powerShellHost } = executor;
  const encoded = powerShellHost ? findPowerShellEncodedCommand(args) : null;
  if (encoded?.inline) {
    result.uninspectable.push('PowerShell does not run the -EncodedCommand:value spelling as an encoded command; pass the value as a separate argument');
  } else if (encoded) {
    const decoded = decodePowerShellEncodedCommand(encoded.value);
    if (decoded === null) {
      // Behind an ambiguous switch the value may be a script's own argument;
      // one that does not decode runs nothing as a command on either host.
      if (!encoded.ambiguous) result.uninspectable.push('the PowerShell -EncodedCommand value could not be decoded');
    } else {
      scanShellCommand(decoded, SHELL_DIALECT_POWERSHELL, result, depth + 1);
    }
  }
  for (let index = 0; index < args.length; index++) {
    if (encoded && index >= encoded.index && index < encoded.index + encoded.length) continue;
    const arg = args[index];
    // Option names (`-c`, `-NoProfile`, `/c`) are not command lines.
    if (/^(?:[-–-―]|\/{1,2}[A-Za-z]$)/.test(arg) && !/\s/.test(arg)) continue;
    scanShellCommand(arg, innerDialect, result, depth + 1);
  }
}

/**
 * Collect the paths a tool input names, and the reasons its command cannot be
 * inspected.
 * @param {Object} toolInput
 * @param {string} [toolName]
 * @returns {{paths: Array<{value: string, field: string, operation?: string, ignoreCase?: boolean}>, uninspectable: string[]}}
 */
function analyzeToolInput(toolInput, toolName) {
  const result = { paths: [], uninspectable: [] };
  if (!toolInput) return result;

  if (toolInput.file_path) result.paths.push({ value: toolInput.file_path, field: 'file_path' });
  if (toolInput.path) result.paths.push({ value: toolInput.path, field: 'path' });
  if (toolInput.pattern) result.paths.push({ value: toolInput.pattern, field: 'pattern' });

  if (typeof toolInput.command === 'string') {
    // A patch header names a file in both cases: as the patch tool's input, or
    // inside a shell command (for example an apply_patch heredoc).
    result.paths.push(...extractPatchPaths(toolInput.command));
    if (!isPatchTool(toolName)) {
      scanShellCommand(toolInput.command, shellDialect(toolName), result, 0);
    }
  }

  result.paths = result.paths.filter(p => p.value);
  return result;
}

/**
 * Name the file operation a tool performs on a direct path argument.
 * Provider-neutral: covers the shared tool vocabulary every adapter projects.
 * @param {string} toolName
 * @returns {'read'|'write'|'edit'}
 */
function toolOperation(toolName) {
  const name = String(toolName || '').toLowerCase();
  if (name === 'write') return 'write';
  if (name === 'edit' || name === 'multiedit' || name === 'notebookedit') return 'edit';
  return 'read';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove approval markers from the tool input so the tool receives the real
 * path. Only markers that directly precede one of the given approved paths are
 * removed; unrelated text is left untouched.
 *
 * @param {Object} toolInput - Original tool input
 * @param {string[]} approvedPaths - Paths (without marker) approved for this call
 * @returns {Object} A shallow copy of toolInput with markers removed
 */
function stripApprovalMarkers(toolInput, approvedPaths) {
  const updated = { ...toolInput };
  for (const field of ['file_path', 'path', 'pattern']) {
    if (typeof updated[field] === 'string') updated[field] = stripApprovalPrefix(updated[field]);
  }
  if (typeof updated.command === 'string') {
    let command = updated.command;
    for (const approvedPath of new Set(approvedPaths)) {
      const marker = new RegExp(
        `(^|[\\s'"‘-„=<>(|;&\`:])${escapeRegExp(APPROVED_PREFIX)}(?=["'‘-„]?${escapeRegExp(approvedPath)}(?:$|[\\s'"‘-„<>()|;&\`,]))`,
        'gm'
      );
      command = command.replace(marker, '$1');
    }
    updated.command = command;
  }
  return updated;
}

/**
 * Check whether the user turned the privacy guard off in `.aif.json`.
 *
 * Only an explicit `hooks.privacy-block: false` disables it. Anything else — no
 * setting, an unreadable config — leaves the guard on:
 * this is the check that stands between the model and a `.env`, so the failure
 * direction has to be "keep blocking", never "assume they meant off".
 *
 * @param {object} [options]
 * @param {string} [options.cwd] - Project scope for the resolve.
 * @returns {boolean} true if privacy block should be skipped
 */
function isPrivacyBlockDisabled(options) {
  return !isHookEnabled('privacy-block', options?.cwd);
}

/**
 * Build the provider-neutral approval question for a blocked access. Each
 * runtime presents it through its own ask-user capability.
 * @param {string} filePath - Blocked file path
 * @param {'read'|'write'|'edit'} [operation='read'] - Blocked operation
 * @param {string} [cwd] - Directory the path is relative to; when given, the
 *   question names the resolved absolute path so the user sees which file it is.
 * @param {{files: string[], patterns: string[]}} [projectIgnore] - Untrusted
 *   project `.aifignore` rules that would skip this path; the question then
 *   shows them and also asks to trust them.
 * @returns {Object} Prompt data object
 */
function buildPromptData(filePath, operation = 'read', cwd, projectIgnore) {
  const basename = path.basename(filePath);
  const resolvedPath = cwd ? path.resolve(cwd, filePath) : filePath;
  const trustOffer = Boolean(projectIgnore?.files?.length);
  const text = trustOffer
    ? `I need to ${operation} "${basename}" (${resolvedPath}), which may contain sensitive data (API keys, passwords, tokens). `
      + `This project's .aifignore (${projectIgnore.files.join(', ')}) allows it, but those rules come with the repository and are not trusted yet. `
      + `Approving also trusts these rules, which skip the privacy check for every project path they match until the files change: ${formatIgnoreRules(projectIgnore.patterns)}. `
      + 'Do you approve this access and trust these rules?'
    : `I need to ${operation} "${basename}" (${resolvedPath}), which may contain sensitive data (API keys, passwords, tokens). Do you approve this one time?`;
  return {
    type: 'PRIVACY_PROMPT',
    file: filePath,
    resolvedPath,
    basename: basename,
    operation,
    question: {
      header: 'File Access',
      text,
      options: [
        trustOffer
          ? { label: 'Yes, approve and trust', description: `Allow this ${operation} of ${basename} and apply this project's .aifignore rules until they change` }
          : { label: 'Yes, approve once', description: `Allow one ${operation} of ${basename}` },
        { label: 'No, skip this file', description: 'Continue without accessing this file' }
      ]
    }
  };
}

const MAX_SHOWN_IGNORE_RULES = 20;
const MAX_SHOWN_RULE_LENGTH = 120;

// The approval question lists every rule it asks the user to trust; trust is
// not offered for rules too many or too long to show in full.
function rulesFitQuestion(patterns = []) {
  return patterns.length <= MAX_SHOWN_IGNORE_RULES
    && patterns.every(rule => rule.length <= MAX_SHOWN_RULE_LENGTH);
}

function formatIgnoreRules(patterns = []) {
  return patterns.map(rule => JSON.stringify(rule)).join(', ');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Collect every privacy-sensitive access a tool call makes, de-duplicated by
 * path, operation, and whether the approval marker was written.
 * @param {string} toolName
 * @param {Array<{value: string, field: string, operation?: string, ignoreCase?: boolean}>} paths
 *   The paths the call names, as analyzeToolInput collects them
 * @returns {Array<{filePath: string, operation: string, approvalClaimed: boolean}>}
 */
function collectSensitiveAccesses(toolName, paths) {
  const accesses = [];
  const seen = new Set();
  const defaultOperation = toolOperation(toolName);
  for (const { value, field, operation, ignoreCase, glob } of paths) {
    if (!isPrivacySensitive(value, { ignoreCase, glob })) continue;
    const approvalClaimed = Boolean(hasApprovalPrefix(value));
    const access = {
      filePath: stripApprovalPrefix(value),
      operation: operation || (field === 'command' ? 'read' : defaultOperation),
      approvalClaimed,
      fromCommand: field === 'command',
    };
    const key = JSON.stringify([access.filePath, access.operation, approvalClaimed]);
    if (seen.has(key)) continue;
    seen.add(key);
    accesses.push(access);
  }
  return accesses;
}

/**
 * Check if a tool call accesses privacy-sensitive files.
 *
 * Every first access is blocked, on every tool and every runtime. A retry is
 * allowed only when each sensitive path carries the approval marker AND the
 * caller confirms a matching pending grant through `isGranted`. A marker alone
 * is never accepted: the model can write it without asking anyone. The grant
 * makes approval cooperative and single-use; it is not proof of user consent.
 *
 * @param {Object} params
 * @param {string} params.toolName - Name of tool (Read, Write, Bash, PowerShell, apply_patch, etc.)
 * @param {Object} params.toolInput - Tool input with file_path, path, command, etc.
 * @param {Object} [params.options]
 * @param {boolean} [params.options.disabled] - Skip checks if true
 * @param {string} [params.options.cwd] - Project scope for the preference resolve
 * @param {(access: {filePath: string, operation: string}) => boolean} [params.options.isGranted]
 *   Reports whether a pending allow-once grant matches the access. Defaults to
 *   no grant, so a marker without a grant is blocked.
 * @param {Object} [params.options.aifignore] - Loaded `.aifignore` rules
 *   (lib/aifignore.cjs). Accesses they skip are dropped; a skip by untrusted
 *   project rules keeps the access guarded and adds `projectIgnoreTrust` to
 *   the result, and a skip by trusted project rules is listed in
 *   `projectSkipped` so the caller can surface it.
 * @param {boolean} [params.options.offerTrust=true] - Whether an approval
 *   can record trust in project rules; when false the question never offers it.
 * A command that cannot be inspected (an undecodable PowerShell
 * `-EncodedCommand`, or executors nested past the inspection depth) is blocked
 * with `uninspectable: true` and no accesses.
 *
 * @returns {{
 *   blocked: boolean,
 *   uninspectable?: boolean,
 *   approved?: boolean,
 *   filePath?: string,
 *   operation?: string,
 *   accesses?: Array<{filePath: string, operation: string, approvalClaimed: boolean}>,
 *   reason?: string,
 *   suspicious?: boolean,
 *   promptData?: Object,
 *   projectIgnoreTrust?: {projectRoot: string, digest: string, files: string[]},
 *   projectSkipped?: Array<{filePath: string, operation: string}>
 * }}
 */
function checkPrivacy({ toolName, toolInput, options = {} }) {
  const { disabled, cwd, isGranted = () => false, aifignore, offerTrust = true } = options;

  // Check if disabled via options or config
  if (disabled || isPrivacyBlockDisabled({ cwd })) {
    return { blocked: false };
  }

  const { paths, uninspectable } = analyzeToolInput(toolInput, toolName);
  // A command whose effect cannot be read cannot be cleared: block it. No
  // approval applies, because there is no path to approve.
  if (uninspectable.length > 0) {
    return {
      blocked: true,
      uninspectable: true,
      accesses: [],
      reason: `Command cannot be checked for sensitive file access: ${uninspectable[0]}`,
    };
  }

  const { accesses, projectSkipped } = applyAifignore(
    collectSensitiveAccesses(toolName, paths),
    aifignore,
    typeof toolInput?.command !== 'string' || SIMPLE_READ_COMMAND.test(toolInput.command),
  );
  if (accesses.length === 0) {
    return projectSkipped.length > 0 ? { blocked: false, projectSkipped } : { blocked: false };
  }

  const pending = accesses.filter(access => !(access.approvalClaimed && isGranted(access)));
  if (pending.length === 0) {
    const approved = {
      blocked: false,
      approved: true,
      filePath: accesses[0].filePath,
      operation: accesses[0].operation,
      accesses,
      suspicious: accesses.some(access => isSuspiciousPath(access.filePath))
    };
    if (projectSkipped.length > 0) approved.projectSkipped = projectSkipped;
    return approved;
  }

  // Ask about the path the project rules would skip, so the trust offer
  // describes the file it names.
  // Trust is offered only when the question can show every rule in full.
  const offered = offerTrust && rulesFitQuestion(aifignore?.projectPatterns)
    ? pending.find(access => access.projectIgnorePending)
    : undefined;
  const first = offered || pending[0];
  const projectIgnoreTrust = offered
    ? {
      projectRoot: aifignore.projectRoot,
      digest: aifignore.projectDigest,
      files: aifignore.projectFiles,
      patterns: aifignore.projectPatterns,
    }
    : null;
  const result = {
    blocked: true,
    filePath: first.filePath,
    operation: first.operation,
    accesses: pending,
    reason: `Sensitive file ${first.operation} requires user approval`,
    promptData: buildPromptData(first.filePath, first.operation, cwd, projectIgnoreTrust)
  };
  if (projectIgnoreTrust) result.projectIgnoreTrust = projectIgnoreTrust;
  return result;
}

/**
 * Drop the accesses `.aifignore` rules skip. User-scope rules apply directly;
 * project-scope rules apply only once the user trusted their content, and
 * until then the access stays guarded and is marked so the approval question
 * can offer that trust. A path written with the approval marker keeps the
 * grant flow, so the marker never reaches the tool. Paths from a command are
 * skipped only when the command is a simple read, so they are relative to
 * the directory the rules were resolved against.
 * @param {Array<{filePath: string, approvalClaimed: boolean, fromCommand: boolean}>} accesses
 * @param {ReturnType<import('./aifignore.cjs')['loadAifignore']>} [aifignore]
 * @param {boolean} [commandSkippable]
 * @returns {{accesses: Array<Object>, projectSkipped: Array<Object>}}
 */
function applyAifignore(accesses, aifignore, commandSkippable) {
  if (!aifignore) return { accesses, projectSkipped: [] };
  const guarded = [];
  const projectSkipped = [];
  for (const access of accesses) {
    const skippable = !access.approvalClaimed && (!access.fromCommand || commandSkippable);
    const scope = skippable ? aifignore.allowedBy(access.filePath) : null;
    if (scope === 'user') continue;
    if (scope === 'project' && aifignore.projectTrusted) {
      projectSkipped.push(access);
      continue;
    }
    guarded.push(scope === 'project' ? { ...access, projectIgnorePending: true } : access);
  }
  return { accesses: guarded, projectSkipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Main entry point
  checkPrivacy,

  // Helper functions (for testing and direct use)
  isSafeFile,
  isPrivacySensitive,
  hasApprovalPrefix,
  stripApprovalPrefix,
  isSuspiciousPath,
  extractPaths,
  isPatchTool,
  toolOperation,
  stripApprovalMarkers,
  isPrivacyBlockDisabled,
  buildPromptData,

  // Constants
  APPROVED_PREFIX,
  SAFE_PATTERNS,
  PRIVACY_PATTERNS
};
