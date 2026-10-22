'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { repoRoot } = require('./helpers.cjs');

const installer = path.join(repoRoot, 'scripts', 'aif-install.cjs');
const agentIds = fs.readdirSync(path.join(repoRoot, 'agents')).filter((f) => /^aif-.+\.md$/.test(f)).map((f) => f.slice(0, -3));
const ruleNames = fs.readdirSync(path.join(repoRoot, 'rules')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

// Config another kit (AgentKit-shaped) already installed; aif must leave all of it alone.
const SEED = {
  '.claude/agents/planner.md': '---\nname: planner\nmodel: opus\n---\nAgentKit planner\n',
  '.claude/settings.json': JSON.stringify({
    model: 'opus',
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node "/opt/agentkit/hooks/scout.cjs"' }] }] },
  }, null, 4) + '\n',
  '.codex/agents/planner.toml': 'name = "planner"\ndeveloper_instructions = """\nAgentKit planner\n"""\n',
  '.codex/config.toml': 'model = "gpt-5"\n\n[agents.planner]\nconfig_file = "agents/planner.toml"\n\n[features]\nhooks = true\n',
  '.codex/hooks.json': '{\n  "hooks": {\n    "SessionStart": [\n      { "matcher": "startup", "hooks": [ { "type": "command", "command": "node /opt/agentkit/session.cjs" } ] }\n    ]\n  }\n}\n',
  '.codex/AGENTS.md': '# My rules\n\nBe brief.\n',
  // Cursor writes & escapes; a re-serialised file would lose them.
  '.cursor/hooks.json': '{\n  "version": 1,\n  "hooks": {\n    "preToolUse": [\n      { "command": "node /opt/agentkit/privacy.cjs \\u0026\\u0026 true", "type": "command" },\n      { "command": "node /opt/agentkit/privacy.cjs \\u0026\\u0026 true", "type": "command" },\n      { "command": "orca hook", "type": "command" }\n    ]\n  }\n}\n',
  '.omp/agent/agents/planner.md': '---\nname: planner\n---\nAgentKit planner\n',
  '.aif/plans-state.json': '{"plans":{}}\n',
};

function cleanEnv(home) {
  const env = { ...process.env, HOME: home };
  for (const key of Object.keys(env)) {
    if (key.startsWith('AIF_') || key.startsWith('CLAUDE_')) delete env[key];
  }
  return env;
}

function makeHome(seed = SEED) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'aif-install-'));
  const home = path.join(base, 'home');
  fs.mkdirSync(home);
  for (const [rel, content] of Object.entries(seed)) {
    fs.mkdirSync(path.dirname(path.join(home, rel)), { recursive: true });
    fs.writeFileSync(path.join(home, rel), content);
  }
  return { base, home, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

// Every installer run in this file goes through --home; nothing touches the real ~.
function install(home, ...args) {
  const r = spawnSync(process.execPath, [installer, '--home', home, ...args], { cwd: home, env: cleanEnv(home), encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: () => JSON.parse(r.stdout) };
}

// Relative path -> sha256 for every file, and every directory, under home.
function snapshot(home) {
  const out = {};
  (function walk(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, d.name);
      const rel = path.relative(home, full);
      if (d.isDirectory()) {
        out[`${rel}/`] = 'dir';
        walk(full);
      } else {
        out[rel] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      }
    }
  })(home);
  return out;
}

const read = (home, rel) => fs.readFileSync(path.join(home, rel), 'utf8');
const exists = (home, rel) => fs.existsSync(path.join(home, rel));

const EXPECTED = {
  claude: (h) => [...agentIds.map((id) => `.claude/agents/${id}.md`), ...ruleNames.map((r) => `.claude/rules/aif-${r}.md`)],
  codex: (h) => agentIds.map((id) => `.codex/agents/${id}.toml`),
  omp: (h) => [...agentIds.map((id) => `.omp/agent/agents/${id}.md`), ...ruleNames.map((r) => `.omp/agent/rules/aif-${r}.md`)],
  cursor: (h) => [...agentIds.map((id) => `.cursor/agents/${id}.md`), ...ruleNames.map((r) => `.cursor/rules/aif-${r}.mdc`)],
};
const SHARED = ['.aif/hooks/session-init.cjs', '.aif/hooks/cursor-adapter.cjs', '.aif/hooks/lib/config.cjs',
  '.aif/rules/development-rules.md', '.aif/skills/engineering/aif-plan/scripts/plan.cjs'];

function aifCommands(hooks) {
  return Object.values(hooks).flat().flatMap((g) => (g.hooks ? g.hooks : [g])).map((h) => h.command).filter((c) => c.includes('/.aif/hooks/'));
}

for (const runtime of ['claude', 'codex', 'omp', 'cursor', 'all']) {
  test(`install --runtime ${runtime}: writes, keeps other entries, is idempotent and uninstalls cleanly`, () => {
    const { home, cleanup } = makeHome();
    try {
      const before = snapshot(home);
      const first = install(home, '--runtime', runtime);
      assert.equal(first.code, 0, first.stderr);

      const runtimes = runtime === 'all' ? ['claude', 'codex', 'omp', 'cursor'] : [runtime];
      for (const r of runtimes) for (const rel of EXPECTED[r](home)) assert.ok(exists(home, rel), rel);
      const hookRuntime = runtimes.some((r) => r !== 'omp');
      for (const rel of SHARED) assert.equal(exists(home, rel), hookRuntime, rel);
      assert.ok(!exists(home, '.aif/hooks/hooks.json'));
      // Other kits' files are untouched.
      for (const rel of ['.claude/agents/planner.md', '.codex/agents/planner.toml', '.omp/agent/agents/planner.md', '.aif/plans-state.json']) {
        assert.equal(read(home, rel), SEED[rel], rel);
      }

      if (runtimes.includes('claude')) {
        const settings = JSON.parse(read(home, '.claude/settings.json'));
        assert.equal(settings.model, 'opus');
        assert.equal(settings.hooks.PreToolUse[0].hooks[0].command, 'node "/opt/agentkit/hooks/scout.cjs"');
        assert.equal(aifCommands(settings.hooks).length, 6);
        assert.match(read(home, '.claude/settings.json'), /^\{\n {4}"model"/);
      }
      if (runtimes.includes('codex')) {
        const config = read(home, '.codex/config.toml');
        assert.ok(config.startsWith(SEED['.codex/config.toml']), 'existing config kept in place');
        assert.equal((config.match(/^\[features\]/gm) || []).length, 1);
        for (const id of agentIds) assert.ok(config.includes(`[agents.${id}]\nconfig_file = "agents/${id}.toml"`), id);
        const toml = read(home, '.codex/agents/aif-planner.toml');
        assert.match(toml, /^name = "aif-planner"\ndescription = ".+"\nmodel = ".+"\nmodel_reasoning_effort = ".+"\ndeveloper_instructions = '''\n/);
        assert.ok(!toml.includes('\nmodel: '), 'no frontmatter in the TOML body');
        const hooks = JSON.parse(read(home, '.codex/hooks.json')).hooks;
        assert.equal(hooks.SessionStart[0].hooks[0].command, 'node /opt/agentkit/session.cjs');
        const commands = aifCommands(hooks);
        assert.equal(commands.length, 6);
        for (const c of commands) assert.match(c, /^AIF_RUNTIME=codex node "/);
        const agentsMd = read(home, '.codex/AGENTS.md');
        assert.ok(agentsMd.startsWith(SEED['.codex/AGENTS.md']));
        for (const r of ruleNames) assert.ok(agentsMd.includes(`## Rule: ${r}\n`), r);
      }
      if (runtimes.includes('omp')) {
        assert.match(read(home, '.omp/agent/agents/aif-chef.md'), /\nmodel: "@[a-z]+"\n/);
        assert.match(read(home, '.omp/agent/rules/aif-development-rules.md'), /^---\nalwaysApply: true\n---\n# Development Rules\n/);
        assert.match(read(home, '.omp/agent/rules/aif-process-management.md'), /^---\ndescription: ".+"\nalwaysApply: false\n---\n/);
      }
      if (runtimes.includes('cursor')) {
        const agent = read(home, '.cursor/agents/aif-planner.md');
        assert.ok(!/\ntools:/.test(agent));
        assert.match(agent, /\nmodel: \S+\n/);
        assert.match(read(home, '.cursor/rules/aif-development-rules.mdc'), /^---\nalwaysApply: true\n---\n/);
        assert.match(read(home, '.cursor/rules/aif-process-management.mdc'), /^---\ndescription: ".+"\nalwaysApply: false\n---\n/);
        const hooks = JSON.parse(read(home, '.cursor/hooks.json')).hooks;
        assert.equal(hooks.preToolUse.filter((h) => h.command.includes('/opt/agentkit/')).length, 2, 'existing duplicates kept');
        assert.ok(hooks.preToolUse.some((h) => h.command === 'orca hook'));
        assert.deepEqual(aifCommands(hooks).map((c) => c.split(' ').pop()).sort(), ['privacy-block', 'scout-block', 'session-init']);
        assert.equal(hooks.beforeSubmitPrompt, undefined);
      }

      const installed = snapshot(home);
      const second = install(home, '--runtime', runtime);
      assert.equal(second.code, 0, second.stderr);
      assert.deepEqual(snapshot(home), installed, 'a second install changes nothing');
      assert.ok(second.stdout.split('\n').filter((l) => /^(create|update|remove) /.test(l)).length === 0);

      const removed = install(home, '--runtime', runtime, '--uninstall');
      assert.equal(removed.code, 0, removed.stderr);
      assert.equal(removed.stderr, '');
      assert.deepEqual(snapshot(home), before, 'uninstall restores the seeded home byte for byte');
    } finally {
      cleanup();
    }
  });
}

test('--dry-run lists every file and writes nothing', () => {
  const { home, cleanup } = makeHome();
  try {
    const before = snapshot(home);
    const r = install(home, '--runtime', 'all', '--dry-run', '--json');
    assert.equal(r.code, 0, r.stderr);
    const actions = r.json().actions;
    const paths = actions.map((a) => path.relative(home, a.path));
    for (const rel of [...EXPECTED.claude(), ...EXPECTED.codex(), ...EXPECTED.omp(), ...EXPECTED.cursor(), ...SHARED]) assert.ok(paths.includes(rel), rel);
    assert.equal(actions.find((a) => a.path.endsWith('.claude/settings.json')).action, 'update');
    assert.deepEqual(snapshot(home), before);
  } finally {
    cleanup();
  }
});

test('an unparseable config aborts the whole install unchanged', async (t) => {
  for (const [rel, content] of [['.claude/settings.json', '{ "hooks": '], ['.codex/config.toml', 'model = "gpt-5"\nthis is not toml\n']]) {
    await t.test(rel, () => {
      const { home, cleanup } = makeHome({ ...SEED, [rel]: content });
      try {
        const before = snapshot(home);
        const r = install(home, '--runtime', 'all');
        assert.equal(r.code, 1);
        assert.match(r.stderr, new RegExp(`cannot parse .*${rel.replace('.', '\\.')}`));
        assert.match(r.stderr, /nothing was changed/);
        assert.deepEqual(snapshot(home), before);
      } finally {
        cleanup();
      }
    });
  }
});

test('codex config with quoted, dotted and indented keys round-trips', () => {
  const seed = {
    '.codex/config.toml': 'model = "gpt-5"\n[desktop.prefs]\n  global = "zed"\n  [desktop.prefs.perPath]\n'
      + '    "/Users/me/my repo" = "zed"\n    \'literal.key\' = 1\n    a . "b c" = true\n'
      + '[projects."/Users/me/x"]\ntrust_level = "trusted"\n',
  };
  const { home, cleanup } = makeHome(seed);
  try {
    assert.equal(install(home, '--runtime', 'codex').code, 0);
    assert.equal(install(home, '--runtime', 'codex', '--uninstall').code, 0);
    assert.equal(read(home, '.codex/config.toml'), seed['.codex/config.toml']);
  } finally {
    cleanup();
  }
});

test('codex tables written inside the aif region after install survive reinstall and uninstall', () => {
  const seed = { '.codex/config.toml': 'model = "gpt-5"\n' };
  const { home, cleanup } = makeHome(seed);
  try {
    assert.equal(install(home, '--runtime', 'codex').code, 0);
    // Codex rewrites config.toml and appends its tables before the trailing `# aif:end` comment.
    const file = path.join(home, '.codex/config.toml');
    const foreign = '[projects."/work/app"]\ntrust_level = "trusted"\n\n[hooks.state."/x/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:00"\n';
    fs.writeFileSync(file, read(home, '.codex/config.toml').replace('# aif:end', `${foreign}# aif:end`));
    assert.equal(install(home, '--runtime', 'codex').code, 0);
    const reinstalled = read(home, '.codex/config.toml');
    assert.ok(reinstalled.includes(foreign), 'reinstall keeps the foreign tables');
    assert.equal((reinstalled.match(/\[agents\.aif-planner\]/g) || []).length, 1);
    assert.equal(install(home, '--runtime', 'codex', '--uninstall').code, 0);
    const after = read(home, '.codex/config.toml');
    assert.ok(after.includes(foreign), 'uninstall keeps the foreign tables');
    assert.ok(!/aif-|aif:/.test(after), 'no aif tables or markers remain');
    assert.ok(after.startsWith('model = "gpt-5"\n'));
  } finally {
    cleanup();
  }
});

test('codex [features] hooks = false is switched on and restored on uninstall', () => {
  const seed = { '.codex/config.toml': '[features]\nhooks = false\nother = 1\n' };
  const { home, cleanup } = makeHome(seed);
  try {
    assert.equal(install(home, '--runtime', 'codex').code, 0);
    const config = read(home, '.codex/config.toml');
    assert.match(config, /^\[features\]\nhooks = true # aif:was-false\nother = 1\n/);
    assert.equal(install(home, '--runtime', 'codex', '--uninstall').code, 0);
    assert.equal(read(home, '.codex/config.toml'), seed['.codex/config.toml']);
    assert.ok(!exists(home, '.aif'));
    assert.ok(!exists(home, '.codex/agents'));
  } finally {
    cleanup();
  }
});

test('a config edited after install keeps the edit and the backup on uninstall', () => {
  const { home, cleanup } = makeHome();
  try {
    assert.equal(install(home, '--runtime', 'claude').code, 0);
    const file = path.join(home, '.claude/settings.json');
    const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
    settings.theme = 'dark';
    fs.writeFileSync(file, JSON.stringify(settings, null, 4) + '\n');
    const r = install(home, '--runtime', 'claude', '--uninstall');
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stderr, /changed after install/);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(after.theme, 'dark');
    assert.equal(aifCommands(after.hooks).length, 0);
    assert.equal(after.hooks.PreToolUse.length, 1);
    assert.equal(fs.readFileSync(`${file}.aif-bak`, 'utf8'), SEED['.claude/settings.json']);
  } finally {
    cleanup();
  }
});

test('the shared payload stays while another hook runtime still uses it', () => {
  const { home, cleanup } = makeHome();
  try {
    assert.equal(install(home, '--runtime', 'claude').code, 0);
    assert.equal(install(home, '--runtime', 'cursor').code, 0);
    assert.equal(install(home, '--runtime', 'claude', '--uninstall').code, 0);
    assert.ok(exists(home, '.aif/hooks/cursor-adapter.cjs'));
    assert.ok(!exists(home, '.claude/agents/aif-planner.md'));
    assert.equal(install(home, '--runtime', 'cursor', '--uninstall').code, 0);
    assert.ok(!exists(home, '.aif/hooks'));
    assert.ok(!exists(home, '.aif/install-manifest.json'));
    assert.equal(read(home, '.aif/plans-state.json'), SEED['.aif/plans-state.json']);
  } finally {
    cleanup();
  }
});

test('install removes files a previous install made that the source no longer has', () => {
  const { home, cleanup } = makeHome({});
  try {
    assert.equal(install(home, '--runtime', 'omp').code, 0);
    const old = path.join(home, '.omp/agent/agents/aif-retired.md');
    fs.writeFileSync(old, 'old agent\n');
    const manifestPath = path.join(home, '.aif/install-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.entries[old] = { owner: 'omp', kind: 'file', created: true, backup: null, sha256: crypto.createHash('sha256').update('old agent\n').digest('hex') };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const r = install(home, '--runtime', 'omp');
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /remove +.*aif-retired\.md/);
    assert.ok(!fs.existsSync(old));
  } finally {
    cleanup();
  }
});

test('the installed hooks find their rules and plan script under ~/.aif', () => {
  const { base, home, cleanup } = makeHome({});
  try {
    assert.equal(install(home, '--runtime', 'cursor').code, 0);
    const project = path.join(base, 'project');
    fs.mkdirSync(project);
    spawnSync('git', ['init', '-q'], { cwd: project });
    const r = spawnSync(process.execPath, [path.join(home, '.aif/hooks/cursor-adapter.cjs'), 'session-init'], {
      cwd: project, env: cleanEnv(home), input: JSON.stringify({ conversation_id: 'c1', workspace_roots: [project] }), encoding: 'utf8',
    });
    const context = JSON.parse(r.stdout).additional_context;
    assert.ok(context.includes(path.join(home, '.aif', 'rules', 'development-rules.md')), context);
  } finally {
    cleanup();
  }
});

test('usage errors exit 2 without touching anything', () => {
  const { home, cleanup } = makeHome({});
  try {
    assert.equal(install(home).code, 2);
    assert.equal(install(home, '--runtime', 'vim').code, 2);
    assert.deepEqual(snapshot(home), {});
  } finally {
    cleanup();
  }
});
