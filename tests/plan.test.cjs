'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sandbox } = require('./helpers.cjs');

const statePath = (sb) => path.join(sb.home, '.aif', 'plans-state.json');
const readState = (sb) => JSON.parse(fs.readFileSync(statePath(sb), 'utf8'));
const snapshot = (dir) => Object.fromEntries(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));

test('plan', async (t) => {
  const sb = sandbox('feature/demo');
  t.after(sb.cleanup);
  let plan;

  await t.test('create scaffolds plan.md and phase stubs named by prefs', () => {
    const r = sb.run('plan', ['create', 'Demo Feature', '--title', 'Demo feature', '--phases', '2', '--json']);
    assert.equal(r.code, 0, r.stderr);
    plan = r.json();
    assert.match(plan.id, /^\d{6}-\d{4}-demo-feature$/);
    assert.equal(plan.branch, 'feature/demo');
    assert.equal(plan.status, 'pending');
    assert.deepEqual(fs.readdirSync(plan.dir).sort(), ['phase-01-phase-1.md', 'phase-02-phase-2.md', 'plan.md']);
    assert.equal(sb.run('plan', ['create', 'Other Feature']).code, 0);
  });

  await t.test('create refuses to overwrite an existing plan', () => {
    // A date-free name makes the collision independent of the clock.
    const cfg = sb.configFile();
    fs.writeFileSync(cfg, JSON.stringify({ plans: { naming: '{slug}' } }));
    assert.equal(sb.run('plan', ['create', 'dup']).code, 0);
    const again = sb.run('plan', ['create', 'dup']);
    assert.equal(again.code, 1);
    assert.match(again.stderr, /plan already exists/);
    fs.rmSync(cfg);
    fs.rmSync(path.join(sb.project, '.aif', 'plans', 'dup'), { recursive: true });
  });

  await t.test('validate passes a fresh plan and exits 3 on a broken one', () => {
    assert.equal(sb.run('plan', ['validate', plan.dir]).code, 0);
    const bad = path.join(sb.project, '.aif', 'plans', 'broken');
    fs.mkdirSync(bad);
    fs.writeFileSync(path.join(bad, 'plan.md'), '---\ntitle: Broken\nstatus: done\n---\n');
    fs.writeFileSync(path.join(bad, 'phase-1.md'), '---\ntitle: x\nstatus: pending\n---\n');
    const r = sb.run('plan', ['validate', 'broken', '--json']);
    assert.equal(r.code, 3);
    const errors = r.json().errors.join('\n');
    assert.match(errors, /status must be one of/);
    assert.match(errors, /phase-NN-<slug>\.md/);
    fs.rmSync(bad, { recursive: true });
  });

  await t.test('check and uncheck toggle boxes, phase status and the plan.md row', () => {
    const phase = path.join(plan.dir, 'phase-01-phase-1.md');
    fs.appendFileSync(phase, '- [ ] second task\n');
    const r = sb.run('plan', ['check', phase, '--json']);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual([r.json().checked, r.json().total], [2, 2]);
    assert.match(fs.readFileSync(phase, 'utf8'), /^status: completed$/m);
    assert.match(fs.readFileSync(path.join(plan.dir, 'plan.md'), 'utf8'), /\(phase-01-phase-1\.md\) \| completed \|/);
    sb.run('plan', ['uncheck', phase]);
    assert.match(fs.readFileSync(phase, 'utf8'), /^status: pending$/m);
    assert.doesNotMatch(fs.readFileSync(phase, 'utf8'), /\[x\]/);
  });

  await t.test('phase close and phase update', () => {
    const phase = path.join(plan.dir, 'phase-02-phase-2.md');
    assert.equal(sb.run('plan', ['phase', 'close', phase]).code, 0);
    assert.match(fs.readFileSync(phase, 'utf8'), /^status: completed$/m);
    assert.equal(sb.run('plan', ['phase', 'update', phase, '--status', 'in-progress', '--comment-id', '991']).code, 0);
    assert.match(fs.readFileSync(phase, 'utf8'), /^status: in-progress$/m);
    assert.equal(readState(sb).plans[plan.dir].phases['phase-02-phase-2.md'].commentId, '991');
    assert.equal(sb.run('plan', ['phase', 'update', phase, '--status', 'done']).code, 1);
  });

  await t.test('status and show report progress', () => {
    const s = sb.run('plan', ['status', plan.dir, '--json']).json();
    assert.equal(s.phases.length, 2);
    assert.equal(s.phases[1].status, 'in-progress');
    const shown = sb.run('plan', ['show', plan.dir, '--json']).json();
    assert.equal(shown.frontmatter.title, 'Demo feature');
    assert.equal(shown.phases.length, 2);
  });

  await t.test('update writes status to the file and provenance to local state only', () => {
    const planFile = path.join(plan.dir, 'plan.md');
    fs.writeFileSync(planFile, fs.readFileSync(planFile, 'utf8').replace('status: pending', 'status: pending  # lifecycle'));
    assert.equal(sb.run('plan', ['update', plan.dir, '--status', 'completed']).code, 0);
    assert.match(fs.readFileSync(planFile, 'utf8'), /^status: completed  # lifecycle$/m);
    const before = fs.readFileSync(planFile, 'utf8');
    assert.equal(sb.run('plan', ['update', plan.id, '--linked-pr', '42', '--issue', '7', '--root-comment-id', 'abc']).code, 0);
    assert.equal(fs.readFileSync(planFile, 'utf8'), before);
    assert.deepEqual(
      (({ linkedPr, issue, rootCommentId }) => ({ linkedPr, issue, rootCommentId }))(readState(sb).plans[plan.dir]),
      { linkedPr: 42, issue: 7, rootCommentId: 'abc' });
    assert.equal(sb.run('plan', ['update', plan.dir, '--status', 'done']).code, 1);
    assert.equal(sb.run('plan', ['update', plan.dir]).code, 1);
  });

  await t.test('resolve: issue, then pointer, then branch; closed plans excluded', () => {
    const plans = sb.run('plan', ['list', '--json']).json().plans;
    assert.equal(plans.length, 2);
    let r = sb.run('plan', ['resolve', '--json']).json();
    assert.equal(r.ambiguous, true, 'two plans on the same branch are ambiguous');
    assert.equal(r.match, null);
    assert.equal(sb.run('plan', ['update', '--status', 'completed']).code, 1, 'no implicit plan when ambiguous');

    r = sb.run('plan', ['resolve', '--issue', '7', '--json']).json();
    assert.equal(r.match.dir, plan.dir);
    assert.equal(r.match.via, 'issue');

    const other = plans.find((p) => p.dir !== plan.dir);
    sb.run('plan', ['use', other.dir]);
    r = sb.run('plan', ['resolve', '--json']).json();
    assert.equal(r.match.dir, other.dir);
    assert.equal(r.match.via, 'pointer');
    assert.equal(sb.run('plan', ['update', '--linked-pr', '5']).code, 0, 'update without a plan uses the resolved one');
    assert.equal(readState(sb).plans[other.dir].linkedPr, 5);

    sb.run('plan', ['use', '--clear']);
    sb.run('plan', ['close', other.dir]);
    r = sb.run('plan', ['resolve', '--json']).json();
    assert.equal(r.match.dir, plan.dir);
    assert.equal(r.match.via, 'branch');

    execFileSync('git', ['checkout', '-q', '-b', 'unrelated'], { cwd: sb.project });
    assert.equal(sb.run('plan', ['resolve', '--json']).json().match, null);
    assert.equal(sb.run('plan', ['status']).stdout.trim(), 'no active plan');
    execFileSync('git', ['checkout', '-q', 'feature/demo'], { cwd: sb.project });
  });

  await t.test('close and archive never touch plan files; list hides archived', () => {
    const before = snapshot(plan.dir);
    // Close through a symlinked path; state must still key on the real directory.
    const link = path.join(sb.base, 'link-to-plan');
    fs.symlinkSync(plan.dir, link);
    assert.equal(sb.run('plan', ['close', link]).code, 0);
    assert.equal(readState(sb).plans[plan.dir].state, 'closed');
    assert.equal(sb.run('plan', ['archive', plan.dir]).code, 0);
    assert.deepEqual(snapshot(plan.dir), before);
    assert.equal(sb.run('plan', ['list', '--json']).json().plans.some((p) => p.dir === plan.dir), false);
    assert.equal(sb.run('plan', ['list', '--all', '--json']).json().plans.find((p) => p.dir === plan.dir).state, 'archived');
  });

  await t.test('cleanup is a dry run unless --apply, and only archives old closed plans', () => {
    const state = readState(sb);
    const closed = Object.keys(state.plans).find((d) => state.plans[d].state === 'closed');
    state.plans[closed].closedAt = new Date(Date.now() - 40 * 86400e3).toISOString();
    fs.writeFileSync(statePath(sb), JSON.stringify(state));
    const dry = sb.run('plan', ['cleanup', '--older-than', '30d', '--json']).json();
    assert.deepEqual(dry, { apply: false, plans: [closed] });
    assert.equal(readState(sb).plans[closed].state, 'closed');
    sb.run('plan', ['cleanup', '--older-than', '30d', '--apply']);
    assert.equal(readState(sb).plans[closed].state, 'archived');
    assert.equal(sb.run('plan', ['cleanup', '--older-than', 'soon']).code, 1);
  });

  await t.test('search, reindex and the plans.dir preference', () => {
    assert.equal(sb.run('plan', ['search', 'Demo feature', '--all', '--json']).json().hits.length > 0, true);
    assert.equal(sb.run('plan', ['reindex', '--json']).json().plans, 2);
    fs.writeFileSync(sb.configFile(), JSON.stringify({ plans: { dir: 'docs/plans', naming: '{slug}' } }));
    const r = sb.run('plan', ['create', 'elsewhere', '--json']).json();
    assert.equal(r.dir, fs.realpathSync(path.join(sb.project, 'docs', 'plans')) + path.sep + 'elsewhere');
    assert.equal(sb.run('plan', ['reindex', '--json']).json().plans, 1);
  });

  await t.test('unknown plans and commands fail with exit 1', () => {
    assert.equal(sb.run('plan', ['show', 'nope']).code, 1);
    assert.equal(sb.run('plan', ['bogus']).code, 1);
    assert.equal(sb.run('plan', ['check', 'missing.md']).code, 1);
  });
});

test('plan state follows AIF_HOME', (t) => {
  const sb = sandbox('feature/aif-home');
  t.after(sb.cleanup);
  const alt = path.join(sb.base, 'alt-home');
  const env = { AIF_HOME: alt };
  const created = sb.run('plan', ['create', 'Home Demo', '--json'], { env });
  assert.equal(created.code, 0, created.stderr);
  assert.equal(sb.run('plan', ['use', created.json().dir], { env }).code, 0);
  assert.ok(fs.existsSync(path.join(alt, 'plans-state.json')), 'state should land in AIF_HOME');
  assert.ok(!fs.existsSync(statePath(sb)), 'state should not land in ~/.aif');
});
