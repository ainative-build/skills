#!/usr/bin/env node
/**
 * scout-checker.cjs - Facade for scout-block modules
 *
 * Provides unified interface to scout-block/* modules for reuse in both
 * Claude hooks and OpenCode plugins.
 *
 * @module scout-checker
 */

const fs = require('fs');
const path = require('path');

// Import scout-block modules
const { loadPatterns, createMatcher, matchPath } = require('../scout-block/pattern-matcher.cjs');
const { extractFromToolInput } = require('../scout-block/path-extractor.cjs');
const { detectBroadPatternIssue } = require('../scout-block/broad-pattern-detector.cjs');

// Project-local list of extra paths to block, at the git root.
const SCOUT_IGNORE_FILE = '.scoutignore';

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

// Build command allowlist - these are allowed even if they contain blocked paths
// Handles flags and filters: npm build, pnpm --filter web run build, yarn workspace app build
const BUILD_COMMAND_PATTERN = /^(npm|pnpm|yarn|bun)\s+([^\s]+\s+)*(run\s+)?(build|test|lint|dev|start|install|ci|add|remove|update|publish|pack|init|create|exec)/;

// Tool commands - JS/TS, Go, Rust, Java, .NET, containers, IaC, Python, Ruby, PHP, Deno, Elixir
const TOOL_COMMAND_PATTERN = /^(\.\/)?(npx|pnpx|bunx|tsc|esbuild|vite|webpack|rollup|turbo|nx|jest|vitest|mocha|eslint|prettier|go|cargo|make|mvn|mvnw|gradle|gradlew|dotnet|docker|podman|kubectl|helm|terraform|ansible|bazel|cmake|sbt|flutter|swift|ant|ninja|meson|python3?|pip|uv|deno|bundle|rake|gem|php|composer|ruby|mix|elixir)/;

// Allow execution from .venv/bin/ or venv/bin/ (Unix) and .venv/Scripts/ or venv/Scripts/ (Windows)
const VENV_EXECUTABLE_PATTERN = /(^|[\/\\])\.?venv[\/\\](bin|Scripts)[\/\\]/;

// Allow Python venv creation commands (cross-platform):
// - python/python3 -m venv (Unix/macOS/Windows)
// - py -m venv (Windows py launcher, supports -3, -3.11, etc.)
// - uv venv (fast Rust-based Python package manager)
// - virtualenv (legacy but still widely used)
const VENV_CREATION_PATTERN = /^(python3?|py)\s+(-[\w.]+\s+)*-m\s+venv\s+|^uv\s+venv(\s|$)|^virtualenv\s+/;

// ═══════════════════════════════════════════════════════════════════════════
// SHELL DIALECTS
// ═══════════════════════════════════════════════════════════════════════════

// Claude Code exposes two command tools with the same `tool_input.command`
// shape: Bash (POSIX shell syntax, Git Bash on Windows) and PowerShell. The
// shell guards apply one policy to both; only the lexical rules differ. The
// difference that matters most for parsing is the escape character: a POSIX
// shell escapes with a backslash, PowerShell escapes with a backtick and
// treats a backslash as an ordinary path separator (`type C:\proj\.env`).
// Any other tool name parses as POSIX, which keeps every other runtime's
// shell tool on the behavior it already had.
const SHELL_DIALECT_POSIX = 'posix';
const SHELL_DIALECT_POWERSHELL = 'powershell';

/** Tools whose `tool_input.command` is a shell command line. */
const SHELL_TOOL_NAMES = Object.freeze(['Bash', 'PowerShell']);

/**
 * @param {unknown} toolName
 * @returns {boolean} true when the tool runs `tool_input.command` in a shell
 */
function isShellTool(toolName) {
  return SHELL_TOOL_NAMES.includes(toolName);
}

/**
 * The syntax a tool's command line is written in.
 * @param {unknown} toolName
 * @returns {'posix'|'powershell'}
 */
function shellDialect(toolName) {
  return toolName === 'PowerShell' ? SHELL_DIALECT_POWERSHELL : SHELL_DIALECT_POSIX;
}

/**
 * The character that escapes the next one outside single quotes.
 * @param {string} [dialect]
 * @returns {string}
 */
function shellEscapeChar(dialect) {
  return dialect === SHELL_DIALECT_POWERSHELL ? '`' : '\\';
}

// PowerShell accepts typographic quotes and dashes wherever it accepts the
// ASCII ones, so `gc “.env”` and `gc –Path:.env` are ordinary commands there.
const POWERSHELL_SINGLE_QUOTES = '‘’‚‛';
const POWERSHELL_DOUBLE_QUOTES = '“”„';
const POWERSHELL_DASHES = '–—―';
// Escape sequences PowerShell decodes inside double-quoted strings. `e (ESC)
// is left out: Windows PowerShell 5.1 reads it as a literal `e`, so decoding
// it would hide paths such as .`env from the guard.
const POWERSHELL_CHARACTER_ESCAPES = Object.freeze({
  0: '\0', a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v',
});
// Characters that end or change a PowerShell bare word unless escaped.
const POWERSHELL_BAREWORD_SYNTAX = /[\s'"`$;|&(){}@,<>#‘-„]/;

/**
 * Decode the PowerShell escape sequence at a backtick: `` `u{XXXX} `` or one
 * of the character escapes (`` `n ``, `` `t ``, ...).
 * @param {string} source
 * @param {number} index - Offset of the backtick
 * @returns {{value: string, length: number}|null} The decoded text and the
 *   source length it replaces; null when the backtick only escapes the next
 *   character literally
 */
function decodePowerShellEscape(source, index) {
  const next = source[index + 1];
  const unicode = next === 'u' ? source.slice(index + 2).match(/^\{([0-9A-Fa-f]{1,6})\}/) : null;
  const codePoint = unicode ? parseInt(unicode[1], 16) : -1;
  if (codePoint >= 0 && codePoint <= 0x10ffff) {
    return { value: String.fromCodePoint(codePoint), length: 2 + unicode[0].length };
  }
  if (Object.prototype.hasOwnProperty.call(POWERSHELL_CHARACTER_ESCAPES, next)) {
    return { value: POWERSHELL_CHARACTER_ESCAPES[next], length: 2 };
  }
  return null;
}

/**
 * Find the here-string that opens at `index` (`@'` or `@"` followed by the end
 * of the line). The body runs to the first line that starts with the matching
 * `'@` or `"@`, as PowerShell requires.
 * @param {string} source
 * @param {number} index - Offset of the `@`
 * @returns {{quote: string, body: string, end: number}|null} `end` is the
 *   offset just past the closing marker; null when no here-string opens here
 *   or it is never closed
 */
function matchHereString(source, index) {
  const quote = source[index + 1];
  if (source[index] !== '@' || (quote !== "'" && quote !== '"')) return null;
  const opener = source.slice(index + 2).match(/^[ \t]*\r?\n/);
  if (!opener) return null;
  const bodyStart = index + 2 + opener[0].length;
  const closer = new RegExp(`\\r?\\n${quote}@`, 'g');
  closer.lastIndex = bodyStart - 1;
  const close = closer.exec(source);
  if (!close || close.index < bodyStart - 1) return null;
  const body = close.index < bodyStart ? '' : source.slice(bodyStart, close.index);
  return { quote, body, end: close.index + close[0].length };
}

/**
 * Rewrite a here-string body as an ordinary quoted string with the same value.
 * @param {string} quote - `'` or `"`
 * @param {string} body
 * @returns {string}
 */
function quoteHereStringBody(quote, body) {
  if (quote === "'") return `'${body.replace(/'/g, "''")}'`;
  let quoted = '"';
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === '`' && index + 1 < body.length) {
      quoted += char + body[++index];
    } else {
      quoted += char === '"' ? '`"' : char;
    }
  }
  return `${quoted}"`;
}

/**
 * Rewrite PowerShell syntax that names the same value in another spelling, so
 * the guards' lexers only have to know the plain form: typographic quotes
 * become ASCII quotes, here-strings become quoted strings, a backtick line
 * continuation becomes a space, a Unicode dash that starts a word becomes `-`,
 * and the escape sequences of double-quoted strings (`` `n ``, `` `u{2e} ``)
 * are decoded.
 * @param {string} command
 * @returns {string}
 */
function normalizePowerShellCommand(command) {
  let source = '';
  for (const char of command) {
    if (POWERSHELL_SINGLE_QUOTES.includes(char)) source += "'";
    else if (POWERSHELL_DOUBLE_QUOTES.includes(char)) source += '"';
    else source += char;
  }

  let normalized = '';
  let quote = null;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote === "'") {
      normalized += char;
      if (char === "'") quote = null;
      continue;
    }
    if (quote === '"') {
      if (char === '`' && index + 1 < source.length) {
        const escape = decodePowerShellEscape(source, index);
        if (escape) {
          normalized += /["`]/.test(escape.value) ? `\`${escape.value}` : escape.value;
          index += escape.length - 1;
        } else {
          normalized += char + source[++index];
        }
        continue;
      }
      normalized += char;
      if (char === '"') quote = null;
      continue;
    }
    if (char === '`' && index + 1 < source.length) {
      const continuation = source.slice(index + 1).match(/^\r?\n/);
      const escape = continuation ? null : decodePowerShellEscape(source, index);
      if (continuation) {
        normalized += ' ';
        index += continuation[0].length;
      } else if (escape) {
        // A bare word decodes the same escapes; a decoded character with
        // syntax of its own stays escaped so it remains part of the word.
        normalized += POWERSHELL_BAREWORD_SYNTAX.test(escape.value) ? `\`${escape.value}` : escape.value;
        index += escape.length - 1;
      } else {
        normalized += char + source[++index];
      }
      continue;
    }
    if (char === '@') {
      const hereString = matchHereString(source, index);
      if (hereString) {
        // Re-scan the rewritten string so its escapes are decoded like any other.
        source = source.slice(0, index)
          + quoteHereStringBody(hereString.quote, hereString.body)
          + source.slice(hereString.end);
        index--;
        continue;
      }
    }
    if (char === "'" || char === '"') {
      quote = char;
      normalized += char;
      continue;
    }
    if (POWERSHELL_DASHES.includes(char) && (index === 0 || /[\s(){};,|&=]/.test(source[index - 1]))) {
      normalized += '-';
      continue;
    }
    normalized += char;
  }
  return normalized;
}

/**
 * Remove POSIX backslash-newline line continuations, which the shell deletes
 * before it splits words (`cat .env\<newline>.local` reads `.env.local`).
 * Single-quoted text is literal and kept as written.
 * @param {string} command
 * @returns {string}
 */
function joinPosixLineContinuations(command) {
  let joined = '';
  let quote = null;
  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (quote === "'") {
      joined += char;
      if (char === "'") quote = null;
      continue;
    }
    if (char === '\\' && index + 1 < command.length) {
      const continuation = command.slice(index + 1).match(/^\r?\n/);
      if (continuation) {
        index += continuation[0].length;
      } else {
        joined += char + command[++index];
      }
      continue;
    }
    if (char === '"' || char === "'") quote = quote === char ? null : (quote || char);
    joined += char;
  }
  return joined;
}

/**
 * Rewrite a command line into the plain spelling the guards parse, without
 * changing which command it runs or which files it names.
 * @param {string} command
 * @param {string} [dialect] - 'posix' (default) or 'powershell'
 * @returns {string}
 */
function normalizeShellCommand(command, dialect) {
  if (typeof command !== 'string' || !command) return command;
  return dialect === SHELL_DIALECT_POWERSHELL
    ? normalizePowerShellCommand(command)
    : joinPosixLineContinuations(command);
}

/**
 * Decode a PowerShell `-EncodedCommand` value: Base64 of UTF-16LE text. Like
 * PowerShell, a trailing odd byte is dropped rather than rejected, so a value
 * PowerShell would still run is never treated as undecodable.
 * @param {unknown} value
 * @returns {string|null} The command text, or null when the value is not a
 *   well-formed encoding
 */
function decodePowerShellEncodedCommand(value) {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/^(["'])(.*)\1$/s, '$2').replace(/\s+/g, '');
  if (!compact || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.length < 2) return null;
  return bytes.subarray(0, bytes.length - (bytes.length % 2)).toString('utf16le');
}

// pwsh/powershell switches that take the next argument as their value, and
// the switches after which every argument belongs to the script or command.
// A switch may be spelled by any prefix, so a prefix of these names counts;
// findPowerShellEncodedCommand still never takes an encoded spelling as a value.
const POWERSHELL_HOST_VALUE_SWITCHES = [
  'configurationfile', 'configurationname', 'custompipename', 'encodedarguments',
  'executionpolicy', 'inputformat', 'outputformat', 'psconsolefile', 'settingsfile',
  'version', 'windowstyle', 'workingdirectory',
];
const POWERSHELL_HOST_VALUE_ALIASES = new Set(['ea', 'ep', 'ex', 'if', 'of', 'wd']);
const POWERSHELL_HOST_FINAL_SWITCHES = ['command', 'commandwithargs', 'file'];
// Host switches that take no value on at least one host. A spelling that is a
// prefix of one of these and of a value switch (`-i`: pwsh -Interactive or
// Windows PowerShell -InputFormat; `-v`: pwsh -Version) is ambiguous.
const POWERSHELL_HOST_FLAG_SWITCHES = [
  'help', 'interactive', 'login', 'mta', 'noexit', 'nologo', 'noninteractive', 'noprofile',
  'noprofileloadtime', 'sta', 'version',
];

/**
 * Parse a `pwsh`/`powershell` host switch spelled with `-`, `--`, `/` or a
 * Unicode dash, optionally followed by `:VALUE`.
 * @param {unknown} word
 * @returns {{name: string, inline: (string|undefined)}|null} The lowercased
 *   switch name and inline value, or null when the word is not a switch
 */
function parsePowerShellHostSwitch(word) {
  const parsed = String(word || '')
    .replace(/^[–-―]/, '-')
    .match(/^(?:-{1,2}|\/)([A-Za-z]+)(?::([\s\S]*))?$/);
  return parsed ? { name: parsed[1].toLowerCase(), inline: parsed[2] } : null;
}

/**
 * Whether a switch name is a spelling of `-EncodedCommand` (any prefix, or
 * the `-ec` alias).
 * @param {string} name - Lowercased switch name
 * @returns {boolean}
 */
function isPowerShellEncodedSwitchName(name) {
  return name === 'ec' || 'encodedcommand'.startsWith(name);
}

/**
 * Find the `-EncodedCommand` value among a `pwsh`/`powershell` host's
 * arguments. The switch is matched in any case and by any prefix PowerShell
 * accepts (`-e`, `-ec`, `-enc`, ...), with a `-`, `--` or `/` prefix. Host
 * switches end at `-File`, `-Command` or the first argument that is not a
 * switch (a script path); later arguments, such as a script's own `-e prod`,
 * are never read as the host's switch. The value follows as the next
 * argument; a value after a colon (`-e:VALUE`) is reported as `inline`,
 * because neither pwsh nor Windows PowerShell runs that spelling as an
 * encoded command (pwsh rejects it as a script name, Windows PowerShell runs
 * the word as command text).
 * @param {string[]} args - The words after the host executable
 * @returns {{index: number, length: number, value: (string|undefined), inline: boolean, ambiguous: boolean}|null}
 *   The switch position, how many words it spans, and its value. `ambiguous`
 *   is set when reaching it took an ambiguous switch's value, so on another
 *   host the words may instead belong to a script (`pwsh -i x.ps1 -e prod`).
 */
function findPowerShellEncodedCommand(args) {
  let ambiguous = false;
  for (let index = 0; index < args.length; index++) {
    const parsed = parsePowerShellHostSwitch(args[index]);
    if (!parsed) return null;
    const { name, inline } = parsed;
    if (isPowerShellEncodedSwitchName(name)) {
      return inline === undefined
        ? { index, length: 2, value: args[index + 1], inline: false, ambiguous }
        : { index, length: 1, value: inline, inline: true, ambiguous };
    }
    if (name === 'cwa' || POWERSHELL_HOST_FINAL_SWITCHES.some(full => full.startsWith(name))) return null;
    const takesValue = POWERSHELL_HOST_VALUE_ALIASES.has(name)
      || POWERSHELL_HOST_VALUE_SWITCHES.some(full => full.startsWith(name));
    // A short spelling can name a different switch on another host (`-i` is
    // -Interactive in pwsh, which takes no value), so an encoded-command
    // spelling is never consumed as the previous switch's value.
    const next = parsePowerShellHostSwitch(args[index + 1]);
    if (takesValue && inline === undefined && !(next && isPowerShellEncodedSwitchName(next.name))) {
      if (POWERSHELL_HOST_FLAG_SWITCHES.some(full => full.startsWith(name))) ambiguous = true;
      index++;
    }
  }
  return null;
}

/**
 * Whether a command word names a PowerShell host executable.
 * @param {string} word
 * @returns {boolean}
 */
function isPowerShellHost(word) {
  const name = String(word || '').replace(/\\/g, '/').split('/').pop().toLowerCase().replace(/\.exe$/, '');
  return name === 'pwsh' || name === 'powershell' || name === 'pwsh-preview';
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strip leading ENV variable assignments and command wrappers (sudo, env, etc.)
 * e.g., "NODE_ENV=production npm run build" → "npm run build"
 * @param {string} command - The command to strip
 * @returns {string}
 */
function stripCommandPrefix(command) {
  if (!command || typeof command !== 'string') return command;
  let stripped = command.trim();
  // Strip env var assignments (KEY=VALUE KEY2=VALUE2 ...)
  stripped = stripped.replace(/^(\w+=\S+\s+)+/, '');
  // Strip common command wrappers (one level)
  stripped = stripped.replace(/^(sudo|env|nice|nohup|time|timeout)\s+/, '');
  // Strip env vars again (sudo env VAR=x cmd)
  stripped = stripped.replace(/^(\w+=\S+\s+)+/, '');
  return stripped.trim();
}

/**
 * Check if a command is a build/tooling command (should be allowed)
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isBuildCommand(command) {
  if (!command || typeof command !== 'string') return false;
  const trimmed = command.trim();
  return BUILD_COMMAND_PATTERN.test(trimmed) || TOOL_COMMAND_PATTERN.test(trimmed);
}

/**
 * Split a compound command into sub-commands on &&, ||, a lone |, ;, and a
 * lone & (background execution). A lone | or & is a real command separator:
 * "npm run build | cat secret.env" and "npm run build & cat secret.env" both
 * run `cat secret.env` as its own process and must be checked on its own,
 * not waved through because the whole string starts with an allowlisted
 * build command (BUILD_COMMAND_PATTERN has no end anchor). A `&` immediately
 * preceded by `>` (`2>&1`) or immediately followed by `>` (`&>out.log`) is a
 * redirect token, not a background separator, and is left untouched.
 * Quote-aware: operators inside a single- or double-quoted argument (e.g. a
 * grep/sed filter regex containing a literal |) are never split points.
 * The dialect's escape character (backslash for POSIX, backtick for
 * PowerShell) escapes the next character outside quotes and inside double
 * quotes (single-quoted text is fully literal in both, so no escaping applies
 * there; PowerShell's doubled '' inside single quotes closes and reopens the
 * quote, which leaves the quote state where it belongs). If a quote is left
 * unterminated the scan can no longer trust its own boundaries, so it fails
 * closed to the old quote-blind split instead of merging the rest of the
 * command into one part an allowlisted head could shield.
 * Does NOT split on newlines — newlines in command strings are typically
 * heredoc bodies or multiline strings, not compound operators.
 *
 * @param {string} command - The compound command string
 * @param {string} [dialect] - 'posix' (default) or 'powershell'
 * @returns {string[]} Array of sub-commands (trimmed, non-empty)
 */
function splitCompoundCommand(command, dialect) {
  if (!command || typeof command !== 'string') return [];
  const escape = shellEscapeChar(dialect);
  const parts = [];
  let current = '';
  let quoteChar = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quoteChar) {
      current += ch;
      if (ch === escape && quoteChar === '"' && i + 1 < command.length) {
        current += command[++i];
        continue;
      }
      if (ch === quoteChar) quoteChar = null;
      continue;
    }
    if (ch === escape && i + 1 < command.length) {
      current += ch + command[++i];
      continue;
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch;
      current += ch;
      continue;
    }
    if ((ch === '&' && command[i + 1] === '&') || (ch === '|' && command[i + 1] === '|')) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }
    if (ch === '|' || ch === ';') {
      parts.push(current);
      current = '';
      continue;
    }
    if (ch === '&' && command[i - 1] !== '>' && command[i + 1] !== '>') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (quoteChar) {
    return command
      .split(/\s*(?:&&|\|\||\||;)\s*/)
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
  }
  parts.push(current);
  return parts.map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
}

// PowerShell's own executors: `pwsh -Command "..."` (optionally after the
// usual startup switches) and `Invoke-Expression "..."` / `iex "..."`.
// PowerShell resolves command and parameter names case-insensitively.
const POWERSHELL_EXECUTOR_PATTERN =
  /^(?:(?:pwsh|powershell)(?:\.exe)?(?:\s+-(?:NoProfile|NoLogo|NonInteractive|nop|nol|noni))*\s+-c(?:ommand)?|Invoke-Expression|iex)\s+(["'])(.+)\1\s*$/i;
const POSIX_EXECUTOR_PATTERN = /^(?:(?:bash|sh|zsh)\s+-c|eval)\s+(["'])(.+)\1\s*$/;

/**
 * Whether `body` is one string between the `quote` characters around it, so
 * those quotes are its own and not the ends of two different strings
 * (`iex "npm test"; gci 'node_modules'`).
 * @param {string} body
 * @param {string} quote - `'` or `"`
 * @param {string} dialect
 * @returns {boolean}
 */
function isWholeQuotedBody(body, quote, dialect) {
  const powershell = dialect === SHELL_DIALECT_POWERSHELL;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (quote === '"' && char === shellEscapeChar(dialect)) {
      if (index + 1 >= body.length) return false;
      index++;
    } else if (char === quote) {
      // PowerShell doubles a quote to put it inside a string of that quote.
      if (!powershell || body[index + 1] !== quote) return false;
      index++;
    }
  }
  return true;
}

// `cmd /c "..."` (or /k, after any other switches). Git Bash spells the
// switches `//c` so they survive its path conversion. cmd keeps a backslash
// literal, so its inner command is parsed with the PowerShell escape rules.
const CMD_EXECUTOR_PATTERN = /^cmd(?:\.exe)?(?:\s+\/{1,2}[A-Za-z](?::\S*)?)*?\s+\/{1,2}[ckCK]\s+(.+?)\s*$/i;

/**
 * Unwrap one shell executor wrapper and name the syntax of the inner command.
 * @param {string} command
 * @returns {{command: string, dialect: (string|null)}} dialect is null when
 *   the command is not a wrapper
 */
function unwrapShellExecutorWithDialect(command) {
  if (!command || typeof command !== 'string') return { command, dialect: null };
  const trimmed = command.trim();
  const posix = trimmed.match(POSIX_EXECUTOR_PATTERN);
  if (posix && isWholeQuotedBody(posix[2], posix[1], SHELL_DIALECT_POSIX)) {
    return { command: posix[2], dialect: SHELL_DIALECT_POSIX };
  }
  const powershell = trimmed.match(POWERSHELL_EXECUTOR_PATTERN);
  if (powershell && isWholeQuotedBody(powershell[2], powershell[1], SHELL_DIALECT_POWERSHELL)) {
    return { command: powershell[2], dialect: SHELL_DIALECT_POWERSHELL };
  }
  const cmd = trimmed.match(CMD_EXECUTOR_PATTERN);
  if (cmd) return { command: cmd[1].replace(/^(["'])(.*)\1$/s, '$2'), dialect: SHELL_DIALECT_POWERSHELL };

  const words = trimmed.split(/\s+/);
  if (isPowerShellHost(words[0])) {
    const encoded = findPowerShellEncodedCommand(words.slice(1));
    const decoded = encoded && !encoded.inline ? decodePowerShellEncodedCommand(encoded.value) : null;
    if (decoded) return { command: decoded, dialect: SHELL_DIALECT_POWERSHELL };
  }
  return { command, dialect: null };
}

/**
 * Unwrap shell executor wrappers (bash -c "...", sh -c '...', eval "...",
 * pwsh -Command "...", pwsh -EncodedCommand ..., Invoke-Expression "...",
 * cmd /c "...").
 * Returns the inner command string for re-processing.
 * @param {string} command - The command to unwrap
 * @returns {string} Inner command, or original if not a shell executor
 */
function unwrapShellExecutor(command) {
  return unwrapShellExecutorWithDialect(command).command;
}

/**
 * Check if command executes from a .venv bin directory
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isVenvExecutable(command) {
  if (!command || typeof command !== 'string') return false;
  return VENV_EXECUTABLE_PATTERN.test(command);
}

/**
 * Check if command creates a Python virtual environment
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isVenvCreationCommand(command) {
  if (!command || typeof command !== 'string') return false;
  return VENV_CREATION_PATTERN.test(command.trim());
}

/**
 * Check if command should be allowed (build, venv executable, or venv creation)
 * Strips ENV prefixes and command wrappers before checking.
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isAllowedCommand(command) {
  const stripped = stripCommandPrefix(command);
  return isBuildCommand(stripped) || isVenvExecutable(stripped) || isVenvCreationCommand(stripped);
}

function findGitRoot(startDir) {
  if (!startDir || typeof startDir !== 'string') return null;

  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    if (fs.existsSync(path.join(dir, '.git')) || dir === root) {
      return fs.existsSync(path.join(dir, '.git')) ? dir : null;
    }

    dir = path.dirname(dir);
  }
}

/**
 * Find an optional project-local .scoutignore at the git root.
 * This keeps overrides stable regardless of the caller cwd inside the repo.
 *
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null}
 */
function findProjectScoutignore(startDir) {
  const gitRoot = findGitRoot(startDir);
  if (!gitRoot) return null;
  const candidate = path.join(gitRoot, SCOUT_IGNORE_FILE);
  return fs.existsSync(candidate) ? candidate : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a tool call accesses blocked directories or uses overly broad patterns
 *
 * @param {Object} params
 * @param {string} params.toolName - Name of tool (Bash, PowerShell, Glob, Read, etc.)
 * @param {Object} params.toolInput - Tool input with file_path, path, pattern, command
 * @param {Object} [params.options]
 * @param {string} [params.options.baselinePath] - Pattern file replacing the built-in list
 * @param {string} [params.options.projectIgnorePath] - Explicit project-local .scoutignore path
 * @param {string} [params.options.cwd] - Working directory used to discover a project .scoutignore
 * @param {boolean} [params.options.checkBroadPatterns] - Check for overly broad glob patterns (default: true)
 * @returns {{
 *   blocked: boolean,
  *   path?: string,
  *   pattern?: string,
  *   reason?: string,
 *   configPath?: string,
  *   isBroadPattern?: boolean,
  *   suggestions?: string[],
  *   isAllowedCommand?: boolean
 * }}
 */
function checkScoutBlock({ toolName, toolInput, options = {} }) {
  const {
    baselinePath,
    projectIgnorePath,
    cwd = process.cwd(),
    checkBroadPatterns = true
  } = options;

  let dialect = shellDialect(toolName);

  // Unwrap shell executor wrappers (bash -c "...", eval "...", pwsh -c "...")
  // so the inner command gets properly analyzed, in the inner shell's syntax.
  if (typeof toolInput.command === 'string' && toolInput.command) {
    let command = normalizeShellCommand(toolInput.command, dialect);
    const unwrapped = unwrapShellExecutorWithDialect(command);
    if (unwrapped.dialect) {
      dialect = unwrapped.dialect;
      command = normalizeShellCommand(unwrapped.command, dialect);
    }
    toolInput = { ...toolInput, command };
  }

  // For shell commands, split compound commands (&&, ||, a lone |, ;, and a
  // lone &) and check each sub-command independently. This prevents
  // "echo msg && npm run build" from being blocked due to the "build" token
  // in the allowed build sub-command, and prevents "npm run build | cat
  // dist/file.js" from being waved through on the build sub-command's
  // allowlist match. Must split BEFORE isAllowedCommand because
  // BUILD_COMMAND_PATTERN has no end anchor and would match the prefix of
  // "npm run build && cat dist/file.js".
  if (toolInput.command) {
    const subCommands = splitCompoundCommand(toolInput.command, dialect);
    const nonAllowed = subCommands.filter(cmd => !isAllowedCommand(cmd));
    if (nonAllowed.length === 0) {
      return { blocked: false, isAllowedCommand: true };
    }
    // Only extract paths from non-allowed sub-commands
    if (nonAllowed.length < subCommands.length) {
      toolInput = { ...toolInput, command: nonAllowed.join(' ; ') };
    }
  }

  // Check for overly broad glob patterns (Glob tool)
  if (checkBroadPatterns && (toolName === 'Glob' || toolInput.pattern)) {
    const broadResult = detectBroadPatternIssue(toolInput);
    if (broadResult.blocked) {
      return {
        blocked: true,
        isBroadPattern: true,
        pattern: toolInput.pattern,
        reason: broadResult.reason || 'Pattern too broad - may fill context with too many files',
        suggestions: broadResult.suggestions || []
      };
    }
  }

  // Built-in patterns (or a baseline file) plus the project's .scoutignore
  const projectPath = projectIgnorePath || findProjectScoutignore(cwd);
  const configPath = projectPath || path.join(findGitRoot(cwd) || cwd, SCOUT_IGNORE_FILE);

  // Load patterns and create matcher
  const patterns = loadPatterns(baselinePath, projectPath);
  const matcher = createMatcher(patterns);

  // Extract paths from tool input
  const extractedPaths = extractFromToolInput(toolInput, { dialect });

  // If no paths extracted, allow operation
  if (extractedPaths.length === 0) {
    return { blocked: false };
  }

  // Check each path against patterns
  for (const extractedPath of extractedPaths) {
    const result = matchPath(matcher, extractedPath);
    if (result.blocked) {
      return {
        blocked: true,
        path: extractedPath,
        pattern: result.pattern,
        configPath,
        reason: `Path matches blocked pattern: ${result.pattern}`
      };
    }
  }

  // All paths allowed
  return { blocked: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Main entry point
  checkScoutBlock,

  // Shell dialects
  SHELL_DIALECT_POSIX,
  SHELL_DIALECT_POWERSHELL,
  SHELL_TOOL_NAMES,
  isShellTool,
  shellDialect,
  shellEscapeChar,
  normalizeShellCommand,
  decodePowerShellEncodedCommand,
  findPowerShellEncodedCommand,
  isPowerShellHost,

  // Command checkers
  isBuildCommand,
  isVenvExecutable,
  isVenvCreationCommand,
  isAllowedCommand,
  splitCompoundCommand,
  stripCommandPrefix,
  unwrapShellExecutor,
  findGitRoot,
  findProjectScoutignore,
  SCOUT_IGNORE_FILE,

  // Re-export scout-block modules for direct access
  loadPatterns,
  createMatcher,
  matchPath,
  extractFromToolInput,
  detectBroadPatternIssue,

  // Patterns (for testing)
  BUILD_COMMAND_PATTERN,
  TOOL_COMMAND_PATTERN,
  VENV_EXECUTABLE_PATTERN,
  VENV_CREATION_PATTERN
};
