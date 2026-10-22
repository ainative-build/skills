'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox } = require('./helpers.cjs');

test('prefs', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const userCfg = path.join(sb.home, '.aif.json');
  const projectCfg = path.join(sb.project, '.aif.json');

  await t.test('resolves defaults with no config', () => {
    const r = sb.run('prefs', ['resolve', '--json']);
    assert.equal(r.code, 0);
    const { prefs } = r.json();
    assert.equal(prefs.plans.dir, 'plans');
    assert.equal(prefs.journal.auto, true);
    assert.equal(prefs.journal.dir, 'plans/journals');
    assert.equal(prefs.reports.dir, 'plans/reports');
  });

  await t.test('project config overrides user config, which overrides defaults', () => {
    fs.writeFileSync(userCfg, JSON.stringify({ plans: { dir: 'user-plans' }, language: 'vi' }));
    fs.writeFileSync(projectCfg, JSON.stringify({ plans: { dir: 'project-plans' } }));
    const { prefs } = sb.run('prefs', ['resolve', '--json']).json();
    assert.equal(prefs.plans.dir, 'project-plans');
    assert.equal(prefs.language, 'vi');
    assert.equal(prefs.plans.naming, '{date}-{slug}');
  });

  await t.test('get prints scalars plainly so skills need no jq', () => {
    assert.equal(sb.run('prefs', ['get', 'journal.auto']).stdout.trim(), 'true');
    assert.equal(sb.run('prefs', ['get', 'plans.dir']).stdout.trim(), 'project-plans');
    assert.deepEqual(sb.run('prefs', ['get', 'journal.auto', '--json']).json(), { key: 'journal.auto', value: true });
  });

  await t.test('corrupt project config falls back without throwing; validate exits 3', () => {
    fs.writeFileSync(projectCfg, '{ not json');
    const r = sb.run('prefs', ['resolve', '--json']);
    assert.equal(r.code, 0);
    assert.equal(r.json().prefs.plans.dir, 'user-plans');
    assert.ok(r.json().sources.some((s) => s.scope === 'project' && s.error));
    assert.equal(sb.run('prefs', ['validate']).code, 3);
  });

  await t.test('wrong-typed values are ignored by resolve and reported by validate', () => {
    fs.writeFileSync(projectCfg, JSON.stringify({ journal: { auto: 'no' } }));
    assert.equal(sb.run('prefs', ['resolve', '--json']).json().prefs.journal.auto, true);
    const v = sb.run('prefs', ['validate', '--json']);
    assert.equal(v.code, 3);
    assert.match(JSON.stringify(v.json()), /journal.auto must be a boolean/);
  });

  await t.test('set and unset write the project file, or the user file with --user', () => {
    fs.rmSync(projectCfg);
    assert.equal(sb.run('prefs', ['set', 'journal.auto', 'false']).code, 0);
    assert.equal(JSON.parse(fs.readFileSync(projectCfg, 'utf8')).journal.auto, false);
    assert.equal(sb.run('prefs', ['get', 'journal.auto']).stdout.trim(), 'false');
    assert.equal(sb.run('prefs', ['set', 'reports.dir', 'out/reports', '--user']).code, 0);
    assert.equal(JSON.parse(fs.readFileSync(userCfg, 'utf8')).reports.dir, 'out/reports');
    assert.equal(sb.run('prefs', ['unset', 'journal.auto']).code, 0);
    assert.equal(sb.run('prefs', ['get', 'journal.auto']).stdout.trim(), 'true');
    assert.equal(sb.run('prefs', ['validate']).code, 0);
  });

  await t.test('hook toggles default to true and can be switched off per hook', () => {
    assert.equal(sb.run('prefs', ['get', 'hooks.scout-block']).stdout.trim(), 'true');
    assert.equal(sb.run('prefs', ['set', 'hooks.scout-block', 'false']).code, 0);
    const { prefs } = sb.run('prefs', ['resolve', '--json']).json();
    assert.equal(prefs.hooks['scout-block'], false);
    assert.equal(prefs.hooks['privacy-block'], true);
    assert.equal(sb.run('prefs', ['set', 'hooks.unknown-hook', 'false']).code, 1);
    assert.equal(sb.run('prefs', ['unset', 'hooks.scout-block']).code, 0);
  });

  await t.test('rejects unsupported keys and bad booleans', () => {
    const bad = sb.run('prefs', ['set', 'visual.theme', 'x']);
    assert.equal(bad.code, 1);
    assert.match(bad.stderr, /unsupported key/);
    assert.equal(sb.run('prefs', ['set', 'journal.auto', 'yes']).code, 1);
  });
});
