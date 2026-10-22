'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const scripts = {
  prefs: path.join(repoRoot, 'skills/engineering/aif-plan/scripts/prefs.cjs'),
  plan: path.join(repoRoot, 'skills/engineering/aif-plan/scripts/plan.cjs'),
  journal: path.join(repoRoot, 'skills/engineering/aif-journal/scripts/journal.cjs'),
};

// A throwaway git project plus an isolated HOME, so user config and local state never leak.
function sandbox(branch = 'feature/demo') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'aif-test-'));
  const project = path.join(base, 'project');
  const home = path.join(base, 'home');
  fs.mkdirSync(project);
  fs.mkdirSync(home);
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: project });
  // An initial commit so tests can switch branches and back.
  execFileSync('git', ['-c', 'user.name=aif-test', '-c', 'user.email=aif-test@example.invalid',
    'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: project });
  const run = (script, args, opts = {}) => {
    const r = spawnSync(process.execPath, [scripts[script] || script, ...args], {
      cwd: opts.cwd || project,
      env: { ...process.env, HOME: home },
      input: opts.input,
      encoding: 'utf8',
    });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: () => JSON.parse(r.stdout) };
  };
  const cleanup = () => fs.rmSync(base, { recursive: true, force: true });
  return { base, project, home, run, cleanup };
}

module.exports = { sandbox, scripts, repoRoot };
