#!/usr/bin/env node
'use strict';
// File-based plan tool. Plans are <plans.dir>/<name>/plan.md + phase-NN-*.md; the files are canonical.
// Lifecycle state (active/closed/archived), current-plan pointers and GitHub ids live in
// $AIF_HOME/plans-state.json (default ~/.aif), so closing or archiving never edits or moves plan files.
//
//   create <slug> [--title t] [--phases n]     list [--all]            search <text> [--all]
//   show [<plan>]    status [<plan>]           validate <plan>         (exit 3 when invalid)
//   resolve [--issue n]                        use <plan> | use --clear
//   update [<plan>] [--status s] [--linked-pr n] [--issue n] [--root-comment-id id]
//   close <plan>     archive <plan>            cleanup [--older-than 720h|30d] [--apply]
//   check <phase-file>    uncheck <phase-file>
//   phase close <phase-file>    phase update <phase-file> [--status s] [--comment-id id]
//   reindex
// Every command accepts --json. <plan> is a plan directory path or its name under plans.dir.
const fs = require('fs');
const path = require('path');
const { resolvePrefs } = require('./prefs.cjs');
const {
  parseArgs, git, parseFrontmatter, setFrontmatterField, loadState, saveState,
  slugify, formatDate, isoDate, runCli, output,
} = require('./lib.cjs');

const PLAN_STATUSES = ['pending', 'in-progress', 'completed', 'cancelled'];
const PHASE_STATUSES = ['pending', 'in-progress', 'completed'];
const PHASE_RE = /^phase-(\d+)-[\w.-]+\.md$/;
const BOX_RE = /^(\s*[-*] )\[( |x|X)\]/gm;

function context() {
  const { prefs, root } = resolvePrefs();
  const plansDir = path.resolve(root, prefs.plans.dir);
  return { prefs, root, plansDir: fs.existsSync(plansDir) ? fs.realpathSync(plansDir) : plansDir, branch: git(['branch', '--show-current']) };
}

function planDirs(ctx) {
  if (!fs.existsSync(ctx.plansDir)) return [];
  return fs.readdirSync(ctx.plansDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(ctx.plansDir, e.name, 'plan.md')))
    .map((e) => path.join(ctx.plansDir, e.name))
    .sort();
}

function locatePlan(ctx, arg) {
  if (!arg) throw new Error('a plan directory or name is required');
  const candidates = [path.resolve(arg), path.join(ctx.plansDir, arg)];
  for (const c of candidates) {
    const dir = path.basename(c) === 'plan.md' ? path.dirname(c) : c;
    // Real paths keep state keys stable when a plan is reached through a symlink.
    if (fs.existsSync(path.join(dir, 'plan.md'))) return fs.realpathSync(dir);
  }
  throw new Error(`plan not found: ${arg}`);
}

function locatePhase(arg) {
  const file = path.resolve(arg);
  if (!fs.existsSync(file) || !PHASE_RE.test(path.basename(file))) throw new Error(`phase file not found: ${arg}`);
  return fs.realpathSync(file);
}

function countBoxes(text) {
  let checked = 0;
  let total = 0;
  for (const m of text.matchAll(BOX_RE)) { total++; if (m[2] !== ' ') checked++; }
  return { checked, total };
}

function phasesOf(dir) {
  return fs.readdirSync(dir).filter((f) => PHASE_RE.test(f))
    .sort((a, b) => Number(a.match(PHASE_RE)[1]) - Number(b.match(PHASE_RE)[1]))
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const { data } = parseFrontmatter(text);
      return { file: f, path: path.join(dir, f), frontmatter: data || {}, ...countBoxes(text) };
    });
}

function readPlan(dir, state = loadState()) {
  const text = fs.readFileSync(path.join(dir, 'plan.md'), 'utf8');
  const { data, body } = parseFrontmatter(text);
  const record = state.plans[dir] || {};
  return {
    id: path.basename(dir), dir, frontmatter: data || {}, body,
    state: record.state || 'active', record, phases: phasesOf(dir),
  };
}

function summary(plan) {
  const f = plan.frontmatter;
  return {
    id: plan.id, dir: plan.dir, title: f.title || null, status: f.status || null, branch: f.branch || null,
    state: plan.state, linkedPr: plan.record.linkedPr || null, issue: plan.record.issue || null,
  };
}

function writeField(file, key, value) {
  fs.writeFileSync(file, setFrontmatterField(fs.readFileSync(file, 'utf8'), key, value));
}

// Keep the plan.md phase table's status cell in step with a phase file's status, when the row links it.
function syncPhaseRow(phaseFile, status) {
  const planFile = path.join(path.dirname(phaseFile), 'plan.md');
  const name = path.basename(phaseFile);
  const text = fs.readFileSync(planFile, 'utf8');
  const updated = text.split('\n').map((line) =>
    line.includes(`](${name})`) && line.includes('|')
      ? line.replace(/\|\s*(pending|in-progress|completed|cancelled)\s*\|/, `| ${status} |`)
      : line).join('\n');
  if (updated !== text) fs.writeFileSync(planFile, updated);
}

function setPhaseStatus(phaseFile, status) {
  if (!PHASE_STATUSES.includes(status)) throw new Error(`phase status must be one of ${PHASE_STATUSES.join(', ')}`);
  writeField(phaseFile, 'status', status);
  syncPhaseRow(phaseFile, status);
}

function updateRecord(dir, patch) {
  const state = loadState();
  state.plans[dir] = { ...(state.plans[dir] || {}), ...patch, updatedAt: new Date().toISOString() };
  saveState(state);
  return state.plans[dir];
}

function resolveActive(ctx, issue) {
  const state = loadState();
  const active = planDirs(ctx).map((d) => readPlan(d, state)).filter((p) => p.state === 'active');
  const result = (plans, via) => ({
    match: plans.length === 1 ? { ...summary(plans[0]), via } : null,
    candidates: plans.map(summary),
    ambiguous: plans.length > 1,
  });
  if (issue !== undefined) return result(active.filter((p) => String(p.record.issue) === String(issue)), 'issue');
  const pointed = state.pointers[ctx.root];
  const byPointer = active.filter((p) => p.dir === pointed);
  if (byPointer.length) return result(byPointer, 'pointer');
  if (ctx.branch) {
    const byBranch = active.filter((p) => p.frontmatter.branch === ctx.branch);
    if (byBranch.length) return result(byBranch, 'branch');
  }
  return result([], null);
}

// Plan argument, else the resolved active plan.
function planOrActive(ctx, arg) {
  if (arg) return locatePlan(ctx, arg);
  const r = resolveActive(ctx);
  if (r.ambiguous) throw new Error(`more than one active plan matches: ${r.candidates.map((c) => c.id).join(', ')}`);
  if (!r.match) throw new Error('no active plan for this worktree; pass a plan directory');
  return r.match.dir;
}

function validatePlan(dir) {
  const errors = [];
  const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, 'plan.md'), 'utf8'));
  if (!data) errors.push('plan.md: missing frontmatter');
  else {
    if (!data.title) errors.push('plan.md: missing title');
    if (!PLAN_STATUSES.includes(data.status)) errors.push(`plan.md: status must be one of ${PLAN_STATUSES.join(', ')}`);
  }
  const seen = new Set();
  for (const p of phasesOf(dir)) {
    const n = Number(p.file.match(PHASE_RE)[1]);
    if (seen.has(n)) errors.push(`${p.file}: duplicate phase number ${n}`);
    seen.add(n);
    if (!p.frontmatter.title) errors.push(`${p.file}: missing title`);
    if (!PHASE_STATUSES.includes(p.frontmatter.status)) errors.push(`${p.file}: status must be one of ${PHASE_STATUSES.join(', ')}`);
  }
  for (const f of fs.readdirSync(dir)) {
    if (/^phase-/.test(f) && f.endsWith('.md') && !PHASE_RE.test(f)) errors.push(`${f}: name must match phase-NN-<slug>.md`);
  }
  return errors;
}

function parseDuration(s) {
  const m = String(s).match(/^(\d+)([hd])$/);
  if (!m) throw new Error('--older-than takes <n>h or <n>d, e.g. 720h or 30d');
  return Number(m[1]) * (m[2] === 'd' ? 24 : 1) * 3600 * 1000;
}

function phaseStub(n, title) {
  return `---\nphase: ${n}\ntitle: ${JSON.stringify(title)}\nstatus: pending\npriority: P2\neffort: ""\ndependencies: []\n---\n\n` +
    `# Phase ${String(n).padStart(2, '0')}: ${title}\n\n## Goal\n\n## Files to Create / Modify\n\n## Tasks & Steps\n- [ ] \n\n## Verification\n`;
}

const commands = {
  create(ctx, args) {
    const slug = slugify(args._[1] || '');
    if (!args._[1]) throw new Error('usage: plan.cjs create <slug> [--title t] [--phases n]');
    const name = ctx.prefs.plans.naming
      .replace('{date}', formatDate(new Date(), ctx.prefs.plans.dateFormat))
      .replace('{slug}', slug);
    const dir = path.join(ctx.plansDir, name);
    if (fs.existsSync(dir)) throw new Error(`plan already exists: ${dir}`);
    const title = args.title || slug.replace(/-/g, ' ');
    const count = Number(args.phases || 0);
    fs.mkdirSync(dir, { recursive: true });
    const rows = [];
    for (let n = 1; n <= count; n++) {
      const file = `phase-${String(n).padStart(2, '0')}-phase-${n}.md`;
      fs.writeFileSync(path.join(dir, file), phaseStub(n, `Phase ${n}`));
      rows.push(`| ${String(n).padStart(2, '0')} | [Phase ${n}](${file}) | pending |`);
    }
    const fm = ['---', `title: ${JSON.stringify(title)}`, 'description: ""', 'status: pending', 'priority: P2',
      'effort: ""', `branch: ${ctx.branch || '""'}`, 'tags: []', 'blockedBy: []', 'blocks: []', `created: ${isoDate()}`, '---'];
    const table = rows.length ? `\n## Phases\n\n| # | Phase | Status |\n|---|---|---|\n${rows.join('\n')}\n` : '';
    fs.writeFileSync(path.join(dir, 'plan.md'), `${fm.join('\n')}\n\n# ${title}\n${table}`);
    return { result: summary(readPlan(dir)), text: dir };
  },

  list(ctx, args) {
    const state = loadState();
    const plans = planDirs(ctx).map((d) => readPlan(d, state)).filter((p) => args.all || p.state !== 'archived').map(summary);
    return { result: { plans }, text: plans.map((p) => `${p.id}\t${p.status}\t${p.state}\t${p.title || ''}`).join('\n') || 'no plans' };
  },

  search(ctx, args) {
    const needle = (args._[1] || '').toLowerCase();
    if (!needle) throw new Error('usage: plan.cjs search <text>');
    const state = loadState();
    const hits = [];
    for (const dir of planDirs(ctx)) {
      if (!args.all && (state.plans[dir] || {}).state === 'archived') continue;
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
          if (line.toLowerCase().includes(needle)) hits.push({ file: path.join(dir, f), line: i + 1, text: line.trim() });
        });
      }
    }
    return { result: { hits }, text: hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join('\n') || 'no matches' };
  },

  show(ctx, args) {
    const plan = readPlan(planOrActive(ctx, args._[1]));
    const phases = plan.phases.map((p) => `  ${p.file}  [${p.frontmatter.status || '?'}]  ${p.checked}/${p.total}`);
    return { result: plan, text: `${plan.dir}\n${fs.readFileSync(path.join(plan.dir, 'plan.md'), 'utf8')}\nphases:\n${phases.join('\n')}` };
  },

  status(ctx, args) {
    let dir;
    if (args._[1]) dir = locatePlan(ctx, args._[1]);
    else {
      const r = resolveActive(ctx);
      if (!r.match) return { result: { plan: null, ambiguous: r.ambiguous, candidates: r.candidates }, text: r.ambiguous ? 'more than one active plan matches' : 'no active plan' };
      dir = r.match.dir;
    }
    const plan = readPlan(dir);
    const phases = plan.phases.map((p) => ({ file: p.file, title: p.frontmatter.title || null, status: p.frontmatter.status || null, checked: p.checked, total: p.total }));
    const done = phases.filter((p) => p.status === 'completed').length;
    const lines = [`${plan.frontmatter.title || plan.id} [${plan.frontmatter.status}] ${done}/${phases.length} phases completed`,
      ...phases.map((p) => `  ${p.file}  [${p.status}]  ${p.checked}/${p.total} checked`)];
    return { result: { plan: summary(plan), phasesCompleted: done, phases }, text: lines.join('\n') };
  },

  validate(ctx, args) {
    const dir = locatePlan(ctx, args._[1]);
    const errors = validatePlan(dir);
    if (errors.length) process.exitCode = 3;
    return { result: { dir, valid: errors.length === 0, errors }, text: errors.length ? errors.join('\n') : `[OK] ${dir} is a valid plan directory` };
  },

  resolve(ctx, args) {
    const r = resolveActive(ctx, args.issue);
    return { result: r, text: r.match ? r.match.dir : r.ambiguous ? `ambiguous: ${r.candidates.map((c) => c.id).join(', ')}` : 'no active plan' };
  },

  use(ctx, args) {
    const state = loadState();
    if (args.clear) {
      delete state.pointers[ctx.root];
      saveState(state);
      return { result: { root: ctx.root, plan: null }, text: `cleared current plan for ${ctx.root}` };
    }
    const dir = locatePlan(ctx, args._[1]);
    state.pointers[ctx.root] = dir;
    saveState(state);
    return { result: { root: ctx.root, plan: dir }, text: `current plan for ${ctx.root}: ${dir}` };
  },

  update(ctx, args) {
    const dir = planOrActive(ctx, args._[1]);
    if (args.status !== undefined) {
      if (!PLAN_STATUSES.includes(args.status)) throw new Error(`status must be one of ${PLAN_STATUSES.join(', ')}`);
      writeField(path.join(dir, 'plan.md'), 'status', args.status);
    }
    const patch = {};
    if (args['linked-pr'] !== undefined) patch.linkedPr = Number(args['linked-pr']);
    if (args.issue !== undefined) patch.issue = Number(args.issue);
    if (args['root-comment-id'] !== undefined) patch.rootCommentId = String(args['root-comment-id']);
    if (args.status === undefined && !Object.keys(patch).length) throw new Error('nothing to update: pass --status, --linked-pr, --issue or --root-comment-id');
    if (Object.keys(patch).length) updateRecord(dir, patch);
    return { result: summary(readPlan(dir)), text: `updated ${dir}` };
  },

  close(ctx, args) {
    const dir = locatePlan(ctx, args._[1]);
    updateRecord(dir, { state: 'closed', closedAt: new Date().toISOString() });
    return { result: summary(readPlan(dir)), text: `closed ${dir}` };
  },

  archive(ctx, args) {
    const dir = locatePlan(ctx, args._[1]);
    updateRecord(dir, { state: 'archived', archivedAt: new Date().toISOString() });
    return { result: summary(readPlan(dir)), text: `archived ${dir}` };
  },

  cleanup(ctx, args) {
    const cutoff = Date.now() - parseDuration(args['older-than'] || '720h');
    const state = loadState();
    const targets = planDirs(ctx).filter((d) => {
      const r = state.plans[d] || {};
      return r.state === 'closed' && r.closedAt && Date.parse(r.closedAt) < cutoff;
    });
    if (args.apply) for (const d of targets) updateRecord(d, { state: 'archived', archivedAt: new Date().toISOString() });
    return { result: { apply: !!args.apply, plans: targets }, text: `${args.apply ? 'archived' : 'would archive'} ${targets.length} plan(s)${targets.length ? '\n' + targets.join('\n') : ''}` };
  },

  check(ctx, args) { return toggle(args, true); },
  uncheck(ctx, args) { return toggle(args, false); },

  phase(ctx, args) {
    const sub = args._[1];
    const file = locatePhase(args._[2] || '');
    if (sub === 'close') setPhaseStatus(file, 'completed');
    else if (sub === 'update') {
      if (args.status !== undefined) setPhaseStatus(file, args.status);
      if (args['comment-id'] !== undefined) {
        const dir = path.dirname(file);
        const phases = { ...((loadState().plans[dir] || {}).phases || {}) };
        phases[path.basename(file)] = { commentId: String(args['comment-id']) };
        updateRecord(dir, { phases });
      }
      if (args.status === undefined && args['comment-id'] === undefined) throw new Error('nothing to update: pass --status or --comment-id');
    } else throw new Error('usage: plan.cjs phase close|update <phase-file>');
    const { data } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    return { result: { file, status: data.status }, text: `${path.basename(file)}: ${data.status}` };
  },

  reindex(ctx) {
    const state = loadState();
    const dirs = planDirs(ctx);
    const orphaned = Object.keys(state.plans).filter((d) => d.startsWith(ctx.plansDir + path.sep) && !dirs.includes(d));
    return { result: { plans: dirs.length, orphaned }, text: `scanned ${dirs.length} plan(s) in ${ctx.plansDir}; plan files are canonical, nothing to rebuild` + (orphaned.length ? `\nstate entries for missing plans: ${orphaned.join(', ')}` : '') };
  },
};

function toggle(args, done) {
  const file = locatePhase(args._[1] || '');
  const text = fs.readFileSync(file, 'utf8').replace(BOX_RE, (_, pre) => `${pre}[${done ? 'x' : ' '}]`);
  fs.writeFileSync(file, text);
  setPhaseStatus(file, done ? 'completed' : 'pending');
  return { result: { file, status: done ? 'completed' : 'pending', ...countBoxes(fs.readFileSync(file, 'utf8')) }, text: `${path.basename(file)}: ${done ? 'checked' : 'unchecked'}` };
}

runCli('plan', (argv) => {
  const args = parseArgs(argv);
  const cmd = commands[args._[0]];
  if (!cmd) throw new Error(`usage: plan.cjs <${Object.keys(commands).join('|')}> [--json]`);
  const { result, text } = cmd(context(), args);
  output(!!args.json, result, text);
});
