#!/usr/bin/env node
'use strict';
// Journal entries: <journal.dir>/<YYYY-MM-DD>-<slug>.md with title/date/summary frontmatter.
//
//   create "<title>" [--summary s] [--stdin | --body-file f] [--date YYYY-MM-DD] [--tags a,b]
//   list                 newest first
//   show <slug>          slug, filename stem, or filename
//   validate [<slug>]    exit 3 when any checked entry is invalid
// Every command accepts --json.
const fs = require('fs');
const path = require('path');

const PLAN_SCRIPTS = path.join(__dirname, '..', '..', 'aif-plan', 'scripts');
let prefsMod;
let lib;
try {
  prefsMod = require(path.join(PLAN_SCRIPTS, 'prefs.cjs'));
  lib = require(path.join(PLAN_SCRIPTS, 'lib.cjs'));
} catch {
  process.stderr.write('journal: aif-plan must be installed next to aif-journal (needs aif-plan/scripts/prefs.cjs and lib.cjs)\n');
  process.exit(1);
}
const { parseArgs, parseFrontmatter, slugify, isoDate, readStdin, runCli, output } = lib;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function journalDir() {
  const { prefs, root } = prefsMod.resolvePrefs();
  return path.resolve(root, prefs.journal.dir);
}

function entries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const file = path.join(dir, f);
    const { data } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    return { file, stem: f.slice(0, -3), title: data?.title ?? null, date: data?.date ?? null, summary: data?.summary ?? null, mtime: fs.statSync(file).mtimeMs };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.mtime - a.mtime);
}

function find(dir, key) {
  const stem = String(key).replace(/\.md$/, '');
  const all = entries(dir);
  const exact = all.filter((e) => e.stem === stem);
  const matches = exact.length ? exact : all.filter((e) => e.stem.endsWith(`-${stem}`));
  if (!matches.length) throw new Error(`journal entry not found: ${key}`);
  if (matches.length > 1) throw new Error(`more than one entry matches ${key}: ${matches.map((m) => m.stem).join(', ')}`);
  return matches[0];
}

function validateFile(file) {
  const errors = [];
  const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (!data) return ['missing frontmatter'];
  if (!data.title || typeof data.title !== 'string') errors.push('missing title');
  if (!DATE_RE.test(String(data.date)) || Number.isNaN(Date.parse(data.date))) errors.push('date must be YYYY-MM-DD');
  if (!/^# .+/m.test(body)) errors.push('missing "# <title>" heading');
  return errors;
}

const commands = {
  create(args) {
    const title = args._[1];
    if (!title) throw new Error('usage: journal.cjs create "<title>" [--summary s] [--stdin | --body-file f] [--date YYYY-MM-DD] [--tags a,b]');
    const date = args.date || isoDate();
    if (!DATE_RE.test(date)) throw new Error('--date must be YYYY-MM-DD');
    let body = '';
    if (args.stdin) body = readStdin();
    else if (args['body-file']) body = fs.readFileSync(args['body-file'], 'utf8');
    const dir = journalDir();
    fs.mkdirSync(dir, { recursive: true });
    const base = `${date}-${slugify(title)}`;
    let file = path.join(dir, `${base}.md`);
    for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${base}-${n}.md`);
    const fm = ['---', `title: ${JSON.stringify(title)}`, `date: ${date}`];
    if (args.summary) fm.push(`summary: ${JSON.stringify(String(args.summary))}`);
    if (args.tags) fm.push(`tags: [${String(args.tags).split(',').map((t) => t.trim()).filter(Boolean).join(', ')}]`);
    fm.push('---');
    // Drop a leading "# heading" from the body; the entry always carries its own title heading.
    const content = body.replace(/^\s*# .*\n+/, '').trim();
    fs.writeFileSync(file, `${fm.join('\n')}\n\n# ${title}\n\n${content || args.summary || ''}\n`.replace(/\n{3,}$/, '\n'));
    return { result: { file, date, title }, text: file };
  },

  list() {
    const all = entries(journalDir()).map(({ mtime, ...e }) => e);
    return { result: { entries: all }, text: all.map((e) => `${e.date}\t${e.stem}\t${e.title || ''}`).join('\n') || 'no journal entries' };
  },

  show(args) {
    if (!args._[1]) throw new Error('usage: journal.cjs show <slug>');
    const e = find(journalDir(), args._[1]);
    const content = fs.readFileSync(e.file, 'utf8');
    const { mtime, ...meta } = e;
    return { result: { ...meta, content }, text: content.trimEnd() };
  },

  validate(args) {
    const dir = journalDir();
    const targets = args._[1] ? [find(dir, args._[1])] : entries(dir);
    const results = targets.map((e) => ({ file: e.file, errors: validateFile(e.file) }));
    const ok = results.every((r) => r.errors.length === 0);
    if (!ok) process.exitCode = 3;
    return { result: { ok, results }, text: results.map((r) => `${r.errors.length ? 'invalid' : 'ok'}  ${path.basename(r.file)}${r.errors.length ? ': ' + r.errors.join('; ') : ''}`).join('\n') || 'no journal entries' };
  },
};

runCli('journal', (argv) => {
  const args = parseArgs(argv);
  const cmd = commands[args._[0]];
  if (!cmd) throw new Error(`usage: journal.cjs <${Object.keys(commands).join('|')}> [--json]`);
  const { result, text } = cmd(args);
  output(!!args.json, result, text);
});
