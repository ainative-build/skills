'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { sandbox, scripts, repoRoot } = require('./helpers.cjs');

const hooksDir = path.join(repoRoot, 'hooks');
// Built by concatenation so no command line in this repo names a dotenv file.
const DOTENV = '.' + 'env';

// The ambient session may itself run under Claude Code or an aif install; strip
// every variable a hook reads so each test chooses its runtime explicitly.
function cleanEnv(home, extra = {}) {
  const env = { ...process.env, HOME: home };
  for (const key of Object.keys(env)) {
    if (key.startsWith('AIF_') || key.startsWith('CLAUDE_')) delete env[key];
  }
  return { ...env, ...extra };
}

function runHook(sb, name, payload, { env = {}, cwd = sb.project } = {}) {
  const r = spawnSync(process.execPath, [path.join(hooksDir, `${name}.cjs`)], {
    cwd,
    env: cleanEnv(sb.home, env),
    input: payload === undefined ? '' : JSON.stringify(payload),
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: () => JSON.parse(r.stdout) };
}

test('hooks/lib/prefs.cjs is a byte-identical copy of the aif-plan prefs script', () => {
  assert.ok(fs.readFileSync(path.join(hooksDir, 'lib/prefs.cjs')).equals(fs.readFileSync(scripts.prefs)));
});

test('hooks.json wires every hook script through the plugin root', () => {
  const config = JSON.parse(fs.readFileSync(path.join(hooksDir, 'hooks.json'), 'utf8'));
  const commands = Object.values(config.hooks).flat().flatMap((entry) => entry.hooks.map((h) => h.command));
  for (const name of ['session-init', 'subagent-init', 'dev-rules-reminder', 'privacy-block', 'scout-block', 'secret-output-guardrail']) {
    assert.ok(commands.includes(`node "\${CLAUDE_PLUGIN_ROOT}/hooks/${name}.cjs"`), name);
    assert.ok(fs.existsSync(path.join(hooksDir, `${name}.cjs`)), name);
  }
  const guard = config.hooks.UserPromptSubmit[0].hooks.map((h) => h.command);
  assert.match(guard[0], /secret-output-guardrail/);
  assert.match(guard[1], /dev-rules-reminder/);
});

test('privacy-block', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const secretFile = path.join(sb.project, DOTENV);
  fs.writeFileSync(secretFile, 'PLACEHOLDER=1\n');
  const read = (filePath, env, session = 'session-1') => runHook(sb, 'privacy-block', {
    session_id: session, cwd: sb.project, tool_name: 'Read', tool_input: { file_path: filePath },
  }, { env });
  // A Claude Code plugin install has no runtime marker; CLAUDE_PROJECT_DIR identifies it.
  const claude = { CLAUDE_PROJECT_DIR: sb.project };

  await t.test('blocks a dotenv read and records a one-time grant', () => {
    const r = read(secretFile, claude);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /@@PRIVACY_PROMPT_START@@/);
    assert.match(r.stderr, /AskUserQuestion/);
    assert.match(r.stderr, /The hook removes the prefix/);
    assert.equal(fs.readdirSync(path.join(sb.home, '.aif/state/privacy-grants')).length, 1);
  });

  await t.test('allows the APPROVED: retry once, with the marker stripped', () => {
    const r = read(`APPROVED:${secretFile}`, claude);
    assert.equal(r.code, 0, r.stderr);
    const out = r.json().hookSpecificOutput;
    assert.equal(out.updatedInput.file_path, secretFile);
    assert.equal(out.permissionDecision, 'ask');
    // The grant is spent: the marker alone no longer opens the file.
    const again = read(`APPROVED:${secretFile}`, claude);
    assert.equal(again.code, 2);
    assert.equal(again.stdout, '');
    assert.match(again.stderr, /PRIVACY BLOCK/);
  });

  await t.test('a grant is bound to its session', () => {
    assert.equal(read(secretFile, claude, 'session-a').code, 2);
    assert.equal(read(`APPROVED:${secretFile}`, claude, 'session-b').code, 2);
  });

  await t.test('allows ordinary files', () => {
    fs.writeFileSync(path.join(sb.project, 'readme.txt'), 'hi');
    assert.equal(read(path.join(sb.project, 'readme.txt'), claude).code, 0);
  });

  await t.test('Codex blocks through stdout JSON and honours apply_patch headers', () => {
    const codex = { AIF_RUNTIME: 'codex' };
    const shell = runHook(sb, 'privacy-block', {
      session_id: 'codex-1', cwd: sb.project, tool_name: 'Bash', tool_input: { command: `cat ${DOTENV}` },
    }, { env: codex });
    assert.equal(shell.code, 0);
    const deny = shell.json().hookSpecificOutput;
    assert.equal(deny.permissionDecision, 'deny');
    assert.match(deny.permissionDecisionReason, /request_user_input/);
    const patch = runHook(sb, 'privacy-block', {
      session_id: 'codex-1', cwd: sb.project, tool_name: 'apply_patch',
      tool_input: { command: `*** Begin Patch\n*** Update File: ${DOTENV}\n@@\n-A=1\n+A=2\n*** End Patch\n` },
    }, { env: codex });
    assert.equal(patch.json().hookSpecificOutput.permissionDecision, 'deny');
  });

  await t.test('a user .aifignore entry skips the guard for that path', () => {
    fs.mkdirSync(path.join(sb.home, '.aif'), { recursive: true });
    fs.writeFileSync(path.join(sb.home, '.aif/.aifignore'), `${DOTENV}\n`);
    assert.equal(read(secretFile, claude, 'session-ignore').code, 0);
    fs.rmSync(path.join(sb.home, '.aif/.aifignore'));
  });
});

test('scout-block', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const bash = (command) => runHook(sb, 'scout-block', { cwd: sb.project, tool_name: 'Bash', tool_input: { command } });

  await t.test('blocks a broad node_modules scan', () => {
    const r = bash("find node_modules -name '*.js'");
    assert.equal(r.code, 2);
    assert.match(r.stderr, /BLOCKED/);
    assert.match(r.stderr, /\.scoutignore/);
  });

  await t.test('allows a normal file read and build commands', () => {
    const r = runHook(sb, 'scout-block', { cwd: sb.project, tool_name: 'Read', tool_input: { file_path: path.join(sb.project, 'src/index.js') } });
    assert.equal(r.code, 0);
    assert.equal(bash('npm run build').code, 0);
  });

  await t.test('a project .scoutignore adds patterns and re-allows with !', () => {
    fs.writeFileSync(path.join(sb.project, '.scoutignore'), 'fixtures\n!dist\n');
    assert.equal(bash('ls fixtures/data').code, 2);
    assert.equal(bash('ls dist/app.js').code, 0);
    fs.rmSync(path.join(sb.project, '.scoutignore'));
  });

  await t.test('Codex blocks through stdout JSON', () => {
    const r = runHook(sb, 'scout-block', { cwd: sb.project, tool_name: 'Bash', tool_input: { command: 'ls node_modules' } },
      { env: { AIF_RUNTIME: 'codex' } });
    assert.equal(r.code, 0);
    assert.equal(r.json().hookSpecificOutput.permissionDecision, 'deny');
  });
});

test('secret-output-guardrail', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const tokenLike = 'ghp_' + 'A'.repeat(36);

  await t.test('adds a reminder for a prompt about a token and never echoes it', () => {
    const r = runHook(sb, 'secret-output-guardrail', { prompt: `use this token ${tokenLike}` });
    assert.equal(r.code, 0);
    const out = r.json().hookSpecificOutput;
    assert.equal(out.hookEventName, 'UserPromptSubmit');
    assert.match(out.additionalContext, /do not print raw credentials/);
    assert.ok(!r.stdout.includes(tokenLike));
  });

  await t.test('reads the Codex user_prompt field and stays silent otherwise', () => {
    assert.match(runHook(sb, 'secret-output-guardrail', { user_prompt: 'where is the api key stored' }).stdout, /additionalContext/);
    assert.equal(runHook(sb, 'secret-output-guardrail', { prompt: 'rename this function' }).stdout, '');
  });
});

test('context hooks', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const created = sb.run('plan', ['create', 'hook-demo', '--title', 'Hook demo', '--json']);
  assert.equal(created.code, 0, created.stderr);
  const planName = fs.readdirSync(path.join(sb.project, '.aif', 'plans')).find((name) => name.endsWith('hook-demo'));
  assert.ok(planName);
  assert.equal(sb.run('plan', ['use', planName]).code, 0);
  const plansDir = fs.realpathSync(path.join(sb.project, '.aif', 'plans'));

  await t.test('session-init prints the plans dir and the plan set with plan.cjs use', () => {
    const r = runHook(sb, 'session-init', { session_id: 's1', cwd: sb.project, source: 'startup' });
    assert.equal(r.code, 0, r.stderr);
    assert.ok(r.stdout.includes(`Plans: ${JSON.stringify(plansDir)}`), r.stdout);
    assert.match(r.stdout, new RegExp(`- Plan: ".*${planName}"`));
    assert.match(r.stdout, /title "Hook demo"/);
    assert.match(r.stdout, /Read and follow development rules: ".*development-rules\.md"/);
    assert.match(r.stdout, /- Plan dir: `.*\.aif\/plans\/\d{6}-\d{4}-\{slug\}\/`/);
  });

  await t.test('session-init reports no plan when plan.cjs is unavailable', () => {
    const r = runHook(sb, 'session-init', { cwd: sb.project }, { env: { AIF_PLAN_CJS: path.join(sb.base, 'missing.cjs') } });
    assert.match(r.stdout, /- Plan: none/);
  });

  await t.test('subagent-init injects context named for the agent type', () => {
    const r = runHook(sb, 'subagent-init', { session_id: 's1', cwd: sb.project, agent_type: 'aif-tester', agent_id: 'a1' });
    assert.equal(r.code, 0, r.stderr);
    const out = r.json().hookSpecificOutput;
    assert.equal(out.hookEventName, 'SubagentStart');
    assert.match(out.additionalContext, /## Subagent: "aif-tester"/);
    assert.match(out.additionalContext, new RegExp(`- Plan: ".*${planName}"`));
    assert.match(out.additionalContext, /- Report: `.*\.aif\/reports\/aif-tester-\d{6}-\d{4}-\{slug\}\.md`/);
  });

  await t.test('dev-rules-reminder injects the development rules once per interval', () => {
    const payload = { session_id: 'remind-1', cwd: sb.project, prompt: 'hello' };
    const first = runHook(sb, 'dev-rules-reminder', payload);
    assert.equal(first.code, 0, first.stderr);
    const context = first.json().hookSpecificOutput.additionalContext;
    assert.match(context, /# Development Rules/);
    assert.match(context, /Run the narrowest useful test first/);
    assert.match(context, /## Plan Context/);
    assert.equal(runHook(sb, 'dev-rules-reminder', payload).stdout, '');
  });

  await t.test('dev-rules-reminder reads AIF_RULES_DIR when set', () => {
    const rulesDir = path.join(sb.base, 'rules');
    fs.mkdirSync(rulesDir);
    fs.writeFileSync(path.join(rulesDir, 'development-rules.md'), '# Custom rules\n- Always test.\n');
    const r = runHook(sb, 'dev-rules-reminder', { session_id: 'remind-2', cwd: sb.project }, { env: { AIF_RULES_DIR: rulesDir } });
    assert.match(r.json().hookSpecificOutput.additionalContext, /# Custom rules/);
  });

  await t.test('language from .aif/config.json reaches the injected context', () => {
    assert.equal(sb.run('prefs', ['set', 'language', 'vi']).code, 0);
    assert.match(runHook(sb, 'session-init', { cwd: sb.project }).stdout, /## Language\n- Respond in "vi"/);
    assert.equal(sb.run('prefs', ['unset', 'language']).code, 0);
  });
});

test('hooks.<name>: false in .aif/config.json makes that hook a no-op', async (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const secretFile = path.join(sb.project, DOTENV);
  fs.writeFileSync(secretFile, 'PLACEHOLDER=1\n');
  const off = (name) => fs.writeFileSync(sb.configFile(), JSON.stringify({ hooks: { [name]: false } }));

  const cases = {
    'privacy-block': () => runHook(sb, 'privacy-block', { session_id: 's', cwd: sb.project, tool_name: 'Read', tool_input: { file_path: secretFile } }),
    'scout-block': () => runHook(sb, 'scout-block', { cwd: sb.project, tool_name: 'Bash', tool_input: { command: 'ls node_modules' } }),
    'secret-output-guardrail': () => runHook(sb, 'secret-output-guardrail', { prompt: 'print the api key' }),
    'session-init': () => runHook(sb, 'session-init', { cwd: sb.project }),
    'subagent-init': () => runHook(sb, 'subagent-init', { cwd: sb.project, agent_type: 'aif-tester' }),
    'dev-rules-reminder': () => runHook(sb, 'dev-rules-reminder', { session_id: 'off', cwd: sb.project }),
  };
  for (const [name, run] of Object.entries(cases)) {
    await t.test(name, () => {
      fs.rmSync(sb.configFile(), { force: true });
      const on = run();
      assert.ok(on.code !== 0 || on.stdout !== '', `${name} should act while enabled`);
      off(name);
      const r = run();
      assert.equal(r.code, 0);
      assert.equal(r.stdout, '');
      assert.equal(r.stderr, '');
    });
  }
});
