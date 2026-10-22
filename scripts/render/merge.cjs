'use strict';
// Pure text transforms for the runtime config files aif-install edits. Each
// returns { apply(current|null) -> string, revert(current) -> string|null }.
// apply is idempotent; revert removes exactly the aif-owned parts (null means
// nothing of the user's is left, so the file can be deleted). A file the
// transform cannot parse raises ParseError and the install aborts unchanged.

class ParseError extends Error {}

function parseJsonObject(text, file) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ParseError(`cannot parse ${file} as JSON (${error.message}); fix or move it, then rerun`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ParseError(`${file} is not a JSON object`);
  return value;
}

function formatJson(value, likeText) {
  const m = likeText && likeText.match(/\n([ \t]+)"/);
  const indent = m ? m[1] : 2;
  const trailing = likeText == null || likeText.endsWith('\n') ? '\n' : '';
  return JSON.stringify(value, null, indent) + trailing;
}

function hooksObject(obj, file) {
  if (obj.hooks === undefined) obj.hooks = {};
  if (!obj.hooks || typeof obj.hooks !== 'object' || Array.isArray(obj.hooks)) throw new ParseError(`${file}: "hooks" is not an object`);
  return obj.hooks;
}

const owned = (marker) => (h) => h && typeof h.command === 'string' && h.command.includes(marker);

// Claude settings.json and Codex hooks.json: hooks.<Event> = [{matcher, hooks: [...]}].
function groupedHooks(file, entries, marker) {
  const isOwned = owned(marker);
  function strip(obj) {
    const hooks = hooksObject(obj, file);
    for (const event of Object.keys(hooks)) {
      if (!Array.isArray(hooks[event])) throw new ParseError(`${file}: hooks.${event} is not an array`);
      const before = hooks[event].length;
      hooks[event] = hooks[event].filter((group) => {
        if (!group || !Array.isArray(group.hooks) || !group.hooks.some(isOwned)) return true;
        group.hooks = group.hooks.filter((h) => !isOwned(h));
        return group.hooks.length > 0;
      });
      if (before > 0 && hooks[event].length === 0) delete hooks[event];
    }
    return obj;
  }
  return {
    apply(current) {
      const obj = strip(current == null ? {} : parseJsonObject(current, file));
      const hooks = hooksObject(obj, file);
      let last = null;
      for (const e of entries) {
        const hook = { type: 'command', command: e.command };
        if (e.commandWindows) hook.commandWindows = e.commandWindows;
        if (last && last.event === e.event && last.matcher === e.matcher) {
          last.group.hooks.push(hook);
          continue;
        }
        const group = { matcher: e.matcher, hooks: [hook] };
        (hooks[e.event] = hooks[e.event] || []).push(group);
        last = { event: e.event, matcher: e.matcher, group };
      }
      return formatJson(obj, current);
    },
    revert(current) {
      const obj = strip(parseJsonObject(current, file));
      if (Object.keys(obj.hooks).length === 0 && Object.keys(obj).length === 1) return null;
      return formatJson(obj, current);
    },
  };
}

// Cursor hooks.json: {version: 1, hooks: {<event>: [{command, type, matcher?}]}}.
function cursorHooks(file, entries, marker) {
  const isOwned = owned(marker);
  function strip(obj) {
    const hooks = hooksObject(obj, file);
    for (const event of Object.keys(hooks)) {
      if (!Array.isArray(hooks[event])) throw new ParseError(`${file}: hooks.${event} is not an array`);
      const before = hooks[event].length;
      hooks[event] = hooks[event].filter((h) => !isOwned(h));
      if (before > 0 && hooks[event].length === 0) delete hooks[event];
    }
    return obj;
  }
  return {
    apply(current) {
      let obj = strip(current == null ? {} : parseJsonObject(current, file));
      if (obj.version === undefined) obj = { version: 1, ...obj };
      const hooks = hooksObject(obj, file);
      for (const e of entries) {
        const hook = { command: e.command, type: 'command' };
        if (e.matcher) hook.matcher = e.matcher;
        if (e.timeout) hook.timeout = e.timeout;
        (hooks[e.event] = hooks[e.event] || []).push(hook);
      }
      return formatJson(obj, current);
    },
    revert(current) {
      const obj = strip(parseJsonObject(current, file));
      const rest = Object.keys(obj).filter((k) => k !== 'version' && k !== 'hooks');
      if (Object.keys(obj.hooks).length === 0 && rest.length === 0) return null;
      return formatJson(obj, current);
    },
  };
}

// A delimited region appended to a text file (Codex AGENTS.md, config.toml).
function stripRegion(text, begin, end) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === begin);
  if (start === -1) return text;
  const stop = lines.findIndex((l, i) => i > start && l.trim() === end);
  if (stop === -1) throw new ParseError(`found "${begin}" without "${end}"; remove the partial block by hand, then rerun`);
  const from = start > 0 && lines[start - 1] === '' ? start - 1 : start;
  lines.splice(from, stop - from + 1);
  return lines.join('\n');
}

function appendRegion(text, region) {
  if (text === '') return `${region}\n`;
  const base = text.endsWith('\n') ? text : `${text}\n`;
  return `${base}\n${region}\n`;
}

function markdownBlock(file, begin, end, body) {
  return {
    apply(current) {
      const text = stripRegion(current == null ? '' : current, begin, end);
      return appendRegion(text, `${begin}\n${body.trimEnd()}\n${end}`);
    },
    revert(current) {
      const text = stripRegion(current, begin, end);
      return text.trim() === '' ? null : text;
    },
  };
}

// Line-level TOML sanity check: every top-level line must be blank, a
// comment, a table header or a key assignment; multi-line strings and arrays
// are skipped. Enough to refuse a file this installer would misread.
// A key is bare, "basic quoted" or 'literal quoted', optionally dotted.
const TOML_KEY = String.raw`(?:[A-Za-z0-9_-]+|"(?:[^"\\]|\\.)*"|'[^']*')`;
const TOML_KV = new RegExp(String.raw`^${TOML_KEY}(?:\s*\.\s*${TOML_KEY})*\s*=\s*(.*)$`);

function checkToml(text, file) {
  let inString = null;
  let depth = 0;
  text.split('\n').forEach((raw, n) => {
    const line = raw.replace(/\r$/, '');
    if (inString) {
      if (line.includes(inString)) inString = null;
      return;
    }
    if (depth > 0) {
      depth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      return;
    }
    const t = line.trim();
    if (t === '' || t.startsWith('#')) return;
    if (/^\[\[?[^\]]+\]\]?\s*(#.*)?$/.test(t)) return;
    const kv = t.match(TOML_KV);
    if (!kv) throw new ParseError(`cannot parse ${file} line ${n + 1} as TOML; fix it, then rerun`);
    const value = kv[1];
    for (const q of ["'''", '"""']) {
      if (value.startsWith(q) && value.indexOf(q, 3) === -1) inString = q;
    }
    if (!inString && value.startsWith('[')) {
      depth = (value.match(/\[/g) || []).length - (value.match(/\]/g) || []).length;
    }
  });
  if (inString || depth > 0) throw new ParseError(`cannot parse ${file} as TOML (unterminated string or array)`);
}

const TOML_BEGIN = '# aif:begin (managed by aif-install; do not edit)';
const TOML_END = '# aif:end';
const WAS_FALSE = '# aif:was-false';
const ADDED = '# aif:added';

// Removes the managed region but keeps any table that is not aif's. Codex
// rewrites config.toml and appends its own tables ([projects.*],
// [hooks.state], ...) before the trailing `# aif:end` comment, so they can
// end up inside the region.
function stripTomlRegion(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === TOML_BEGIN);
  if (start === -1) return text;
  const stop = lines.findIndex((l, i) => i > start && l.trim() === TOML_END);
  if (stop === -1) throw new ParseError(`found "${TOML_BEGIN}" without "${TOML_END}"; remove the partial block by hand, then rerun`);
  const chunks = [];
  for (const line of lines.slice(start + 1, stop)) {
    if (/^\s*\[/.test(line)) chunks.push([line]);
    else if (chunks.length) chunks[chunks.length - 1].push(line);
  }
  const kept = [];
  for (const chunk of chunks) {
    const header = chunk[0].trim();
    if (/^\[agents\.aif-[^\]]*\]/.test(header)) continue;
    const body = /^\[features\]/.test(header) ? chunk.filter((l, i) => i === 0 || !/^\s*hooks\s*=\s*true\s*$/.test(l)) : chunk;
    if (/^\[features\]/.test(header) && !body.slice(1).some((l) => l.trim() && !l.trim().startsWith('#'))) continue;
    kept.push(...body);
  }
  while (kept.length && kept[kept.length - 1].trim() === '') kept.pop();
  const from = start > 0 && lines[start - 1] === '' && !kept.length ? start - 1 : start;
  lines.splice(from, stop - from + 1, ...kept);
  return lines.join('\n');
}

// Codex config.toml: [agents.aif-*] tables in a managed region, plus
// [features] hooks = true (edited in place and marked so revert can undo it).
function codexConfig(file, tables) {
  function revertFeatures(text) {
    return text.split('\n')
      .filter((l) => !l.trimEnd().endsWith(ADDED))
      .map((l) => (l.trimEnd().endsWith(WAS_FALSE) ? l.replace(/hooks\s*=\s*true\s*# aif:was-false\s*$/, 'hooks = false') : l))
      .join('\n');
  }
  return {
    apply(current) {
      const source = current == null ? '' : current;
      checkToml(source, file);
      let text = stripTomlRegion(source);
      const lines = text.split('\n');
      const header = lines.findIndex((l) => /^\s*\[features\]\s*(#.*)?$/.test(l));
      let featuresInRegion = false;
      if (header === -1) {
        featuresInRegion = true;
      } else {
        let end = lines.findIndex((l, i) => i > header && /^\s*\[/.test(l));
        if (end === -1) end = lines.length;
        const i = lines.slice(header + 1, end).findIndex((l) => /^\s*hooks\s*=/.test(l));
        if (i === -1) {
          const indent = (lines[header + 1] || '').match(/^\s*/)[0];
          lines.splice(header + 1, 0, `${indent}hooks = true ${ADDED}`);
        } else {
          const at = header + 1 + i;
          const m = lines[at].match(/^(\s*)hooks\s*=\s*(\S+)/);
          if (m[2] === 'false') lines[at] = `${m[1]}hooks = true ${WAS_FALSE}`;
          else if (m[2] !== 'true') throw new ParseError(`${file}: [features] hooks has an unexpected value`);
        }
        text = lines.join('\n');
      }
      const body = [];
      if (featuresInRegion) body.push('[features]', 'hooks = true', '');
      for (const t of tables) {
        body.push(`[agents.${t.id}]`, `config_file = ${JSON.stringify(t.configFile)}`, `description = ${JSON.stringify(t.description)}`, '');
      }
      return appendRegion(text, `${TOML_BEGIN}\n${body.join('\n').trimEnd()}\n${TOML_END}`);
    },
    revert(current) {
      checkToml(current, file);
      const text = revertFeatures(stripTomlRegion(current));
      return text.trim() === '' ? null : text;
    },
  };
}

module.exports = { ParseError, codexConfig, cursorHooks, groupedHooks, markdownBlock, parseJsonObject };
