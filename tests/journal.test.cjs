'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox, scripts } = require('./helpers.cjs');

test('journal', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const dir = path.join(sb.project, 'plans', 'journals');

  await t.test('create persists title, date, summary, tags and stdin body', () => {
    const r = sb.run('journal', ['create', 'Fixed the flaky test', '--summary', 'Root cause was a race', '--tags', 'bugfix, ci',
      '--date', '2026-10-01', '--stdin', '--json'], { input: '# Draft heading\n\n## What happened\nA race.\n' });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(path.basename(r.json().file), '2026-10-01-fixed-the-flaky-test.md');
    const text = fs.readFileSync(r.json().file, 'utf8');
    assert.match(text, /^title: "Fixed the flaky test"$/m);
    assert.match(text, /^date: 2026-10-01$/m);
    assert.match(text, /^summary: "Root cause was a race"$/m);
    assert.match(text, /^tags: \[bugfix, ci\]$/m);
    assert.match(text, /^# Fixed the flaky test\n\n## What happened\nA race\.\n$/m);
    assert.doesNotMatch(text, /Draft heading/);
  });

  await t.test('--stdin before the title keeps the title positional; collisions get a suffix', () => {
    const r = sb.run('journal', ['create', '--stdin', 'Fixed the flaky test', '--date', '2026-10-01', '--json'], { input: 'again' });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(path.basename(r.json().file), '2026-10-01-fixed-the-flaky-test-2.md');
  });

  await t.test('create with no body falls back to the summary', () => {
    const r = sb.run('journal', ['create', 'Shipped v2', '--summary', 'Released', '--date', '2026-10-05', '--json']);
    assert.match(fs.readFileSync(r.json().file, 'utf8'), /# Shipped v2\n\nReleased\n$/);
  });

  await t.test('list is newest first; show finds by slug or stem', () => {
    const list = sb.run('journal', ['list', '--json']).json().entries;
    assert.equal(list[0].stem, '2026-10-05-shipped-v2');
    assert.equal(list.length, 3);
    assert.match(sb.run('journal', ['show', 'shipped-v2']).stdout, /# Shipped v2/);
    assert.equal(sb.run('journal', ['show', '2026-10-01-fixed-the-flaky-test', '--json']).json().title, 'Fixed the flaky test');
    assert.equal(sb.run('journal', ['show', 'nope']).code, 1);
    sb.run('journal', ['create', 'Shipped v2', '--date', '2026-10-06']);
    const ambiguous = sb.run('journal', ['show', 'shipped-v2']);
    assert.equal(ambiguous.code, 1);
    assert.match(ambiguous.stderr, /more than one entry matches/);
  });

  await t.test('validate passes good entries and exits 3 on a bad one', () => {
    assert.equal(sb.run('journal', ['validate']).code, 0);
    fs.writeFileSync(path.join(dir, '2026-10-09-bad.md'), '---\ntitle: Bad\ndate: 10/09/2026\n---\nno heading\n');
    const r = sb.run('journal', ['validate', '--json']);
    assert.equal(r.code, 3);
    const bad = r.json().results.find((x) => x.file.endsWith('2026-10-09-bad.md'));
    assert.deepEqual(bad.errors, ['date must be YYYY-MM-DD', 'missing "# <title>" heading']);
    assert.equal(sb.run('journal', ['validate', '2026-10-05-shipped-v2']).code, 0);
  });

  await t.test('honours journal.dir and rejects a bad --date', () => {
    fs.writeFileSync(path.join(sb.project, '.aif.json'), JSON.stringify({ journal: { dir: 'docs/journals' } }));
    const r = sb.run('journal', ['create', 'Elsewhere', '--json']);
    assert.match(r.json().file, /docs\/journals\/\d{4}-\d{2}-\d{2}-elsewhere\.md$/);
    assert.equal(sb.run('journal', ['create', 'x', '--date', 'today']).code, 1);
  });

  await t.test('fails clearly when aif-plan is not installed alongside', () => {
    const lone = path.join(sb.base, 'skills', 'aif-journal', 'scripts');
    fs.mkdirSync(lone, { recursive: true });
    fs.copyFileSync(scripts.journal, path.join(lone, 'journal.cjs'));
    const r = sb.run(path.join(lone, 'journal.cjs'), ['list']);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /aif-plan must be installed next to aif-journal/);
  });
});
