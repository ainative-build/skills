#!/usr/bin/env node
'use strict';
// Copy in-scope AgentKit skills and agents into this repo with ak → aif renames applied,
// then print the hand-edit worklist (references the rename cannot resolve on its own).
//
// Usage: node tools/port/transform.cjs [--dry-run] [--force] [--json]
//          [--only skill1,skill2] [--skills-only | --agents-only] [--source-home ~/.claude]
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { repoRoot, loadScope, walk, isBinary, alt, parseArgs, lineOf } = require('./scope.cjs');

const MANIFEST = path.join(__dirname, '.port-manifest.json');

function sha(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function buildRenamer(scope) {
  const src = scope.sourcePrefix;
  const dst = scope.targetPrefix;
  const skillRe = new RegExp(`(^|[^\\w])${src}[-:](${alt(scope.skills)})(?![\\w-])`, 'g');
  const agents = alt(scope.agents);
  const agentRes = [
    // `planner`
    new RegExp('`(' + agents + ')`', 'g'),
    // subagent_type="planner" / subagent_type: planner
    new RegExp(`(subagent_type\\s*[=:]\\s*["']?)(${agents})(?![\\w-])`, 'g'),
    // @planner
    new RegExp(`(^|[^\\w@-])@(${agents})(?![\\w-])`, 'g'),
    // Task(planner)
    new RegExp(`(Task\\()(${agents})(\\))`, 'g'),
    // planner agent / planner subagent
    new RegExp(`(^|[^\\w-])(${agents})( (?:sub)?agents?\\b)`, 'g'),
  ];
  return (text) => {
    let out = text.replace(skillRe, (_, pre, name) => `${pre}${dst}-${name}`);
    out = out.replace(agentRes[0], (_, name) => `\`${dst}-${name}\``);
    out = out.replace(agentRes[1], (_, pre, name) => `${pre}${dst}-${name}`);
    out = out.replace(agentRes[2], (_, pre, name) => `${pre}@${dst}-${name}`);
    out = out.replace(agentRes[3], (_, pre, name, post) => `${pre}${dst}-${name}${post}`);
    out = out.replace(agentRes[4], (_, pre, name, post) => `${pre}${dst}-${name}${post}`);
    return out;
  };
}

function renameFrontmatterName(text, name) {
  return text.replace(/^(---\n[\s\S]*?^name:\s*)(["']?)[^\n"']+\2[ \t]*$/m, `$1${name}`);
}

function buildWorklist(scope) {
  const src = scope.sourcePrefix;
  const patterns = [
    ['removed-skill', new RegExp(`(?:^|[^\\w])${src}[-:](?:${alt(scope.removedSkills)})(?![\\w-])`, 'g')],
    ['ak-reference', new RegExp(`(?:^|[^\\w])${src}[-:][a-z][a-z0-9-]*`, 'g')],
    ['remove-section', new RegExp(`(?:^|[^\\w-])${src} (?:eval|vision|test (?:optimize|classify-e2e|benchmark))\\b`, 'g')],
    ['rewrite-cli', new RegExp(`(?:^|[^\\w-])${src} (?:plan|journal|config)\\b`, 'g')],
    ['ak-cli-other', new RegExp(`(?:^|[^\\w-])${src} (?!plan\\b|journal\\b|config\\b|eval\\b|vision\\b|test\\b)[a-z][a-z-]+\\b`, 'g')],
    ['drop-flag', /--(?:html|wiki|ak-render)\b/g],
    ['agentkit-wording', /\b(?:AgentKit|ClaudeKit|ck migrate)\b|\.ck\.json|\.agentkit\b/g],
    ['explore-agent', /`Explore`|Task\(Explore\)|subagent_type\s*[=:]\s*["']?Explore/g],
  ];
  return (rel, text) => {
    const items = [];
    const seen = new Set();
    for (const [kind, re] of patterns) {
      for (const m of text.matchAll(re)) {
        const line = lineOf(text, m.index + (m[0].match(/^[^\w-]/) ? 1 : 0));
        const key = `${kind}:${line}`;
        if (seen.has(key)) continue;
        // An ak-reference already reported as removed-skill on the same line is noise.
        if (kind === 'ak-reference' && seen.has(`removed-skill:${line}`)) continue;
        seen.add(key);
        const lineText = text.split('\n')[line - 1].trim().slice(0, 160);
        items.push({ file: rel, line, kind, text: lineText });
      }
    }
    return items;
  };
}

function plannedFiles(scope, args) {
  const home = path.resolve(String(args['source-home'] || path.join(os.homedir(), '.claude')));
  const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
  const files = [];
  if (!args['agents-only']) {
    for (const skill of scope.skills) {
      if (only && !only.includes(skill)) continue;
      const srcDir = path.join(home, 'skills', `${scope.sourcePrefix}-${skill}`);
      if (!fs.existsSync(srcDir)) throw new Error(`missing source skill: ${srcDir}`);
      const dstDir = path.join(scope.skillsTargetDir, `${scope.targetPrefix}-${skill}`);
      for (const f of walk(srcDir)) {
        const rel = path.join(dstDir, path.relative(srcDir, f));
        const isSkillMd = path.relative(srcDir, f) === 'SKILL.md';
        files.push({ src: f, rel, rename: isSkillMd ? `${scope.targetPrefix}-${skill}` : null });
      }
    }
  }
  if (!args['skills-only'] && !only) {
    for (const agent of scope.agents) {
      const src = path.join(home, 'agents', `${agent}.md`);
      if (!fs.existsSync(src)) throw new Error(`missing source agent: ${src}`);
      const name = `${scope.targetPrefix}-${agent}`;
      files.push({ src, rel: path.join(scope.agentsTargetDir, `${name}.md`), rename: name });
    }
  }
  return files;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scope = loadScope();
  const rename = buildRenamer(scope);
  const worklistFor = buildWorklist(scope);
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const protectedSet = new Set(scope.protectedTargets);
  const actions = { write: [], unchanged: [], conflict: [], protected: [] };
  const worklist = [];

  for (const file of plannedFiles(scope, args)) {
    const raw = fs.readFileSync(file.src);
    let content = raw;
    if (!isBinary(raw)) {
      let text = rename(raw.toString('utf8'));
      if (file.rename) text = renameFrontmatterName(text, file.rename);
      worklist.push(...worklistFor(file.rel, text));
      content = Buffer.from(text, 'utf8');
    }
    if (protectedSet.has(file.rel)) { actions.protected.push(file.rel); continue; }

    const target = path.join(repoRoot, file.rel);
    const newHash = sha(content);
    if (fs.existsSync(target)) {
      const curHash = sha(fs.readFileSync(target));
      if (curHash === newHash) { actions.unchanged.push(file.rel); manifest[file.rel] = newHash; continue; }
      // A target that no longer matches our last output was hand-edited: keep it.
      if (manifest[file.rel] !== curHash && !args.force) { actions.conflict.push(file.rel); continue; }
    }
    actions.write.push(file.rel);
    if (args['dry-run']) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode: fs.statSync(file.src).mode & 0o777 });
    manifest[file.rel] = newHash;
  }

  if (!args['dry-run']) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

  if (args.json) {
    process.stdout.write(JSON.stringify({ dryRun: !!args['dry-run'], actions, worklist }, null, 2) + '\n');
  } else {
    const verb = args['dry-run'] ? 'would write' : 'wrote';
    console.log(`${verb} ${actions.write.length}, unchanged ${actions.unchanged.length}, ` +
      `conflicts ${actions.conflict.length}, protected ${actions.protected.length}`);
    for (const rel of actions.conflict) console.log(`  conflict (hand-edited, kept; --force to overwrite): ${rel}`);
    for (const rel of actions.protected) console.log(`  protected (owned elsewhere, skipped): ${rel}`);
    const byKind = {};
    for (const w of worklist) byKind[w.kind] = (byKind[w.kind] || 0) + 1;
    console.log(`worklist: ${worklist.length} items ${JSON.stringify(byKind)}`);
    for (const w of worklist) console.log(`  ${w.file}:${w.line} [${w.kind}] ${w.text}`);
  }
  process.exitCode = actions.conflict.length ? 2 : 0;
}

main();
