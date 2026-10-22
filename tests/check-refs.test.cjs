'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { repoRoot } = require('./helpers.cjs');

const checkRefs = path.join(repoRoot, 'tools/check-refs.cjs');

// A minimal repo layout with one shipped skill whose SKILL.md holds `body`.
function fixture(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aif-refs-'));
  fs.mkdirSync(path.join(root, 'skills/engineering/aif-demo'), { recursive: true });
  fs.mkdirSync(path.join(root, 'agents'));
  fs.writeFileSync(path.join(root, 'skills/engineering/aif-demo/SKILL.md'), body);
  return root;
}

function run(root) {
  const r = spawnSync(process.execPath, [checkRefs, '--json', '--root', root], { encoding: 'utf8' });
  return { code: r.status, out: JSON.parse(r.stdout) };
}

test('check-refs flags phrasing that names a skill aif does not ship', (t) => {
  const root = fixture('Follow the installed project-organization skill.\nInvoke "the engineer project-organization skill" skill.\n');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { code, out } = run(root);
  assert.equal(code, 1);
  assert.deepEqual(out.findings.map((f) => [f.line, f.name]), [[1, 'project-organization'], [2, 'project-organization']]);
});

test('check-refs accepts phrasing that names a shipped skill', (t) => {
  const root = fixture('Hand off to the installed demo skill, then the aif-demo skill.\n');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { code, out } = run(root);
  assert.equal(code, 0);
  assert.deepEqual(out.findings, []);
});
