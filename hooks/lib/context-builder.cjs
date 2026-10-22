'use strict';

/**
 * Text blocks the context hooks inject: where plans, reports and docs go,
 * which plan is active, how to name new files, and which rules apply.
 * Every value that comes from the project (paths, branch, plan title) goes
 * through safeDisplayValue so it cannot add lines of its own.
 */

const fs = require('fs');
const path = require('path');
const { safeDisplayValue } = require('./config.cjs');

const DEV_RULES_FILE = 'development-rules.md';

function languageSection(ctx) {
  if (!ctx.language) return [];
  return [
    '## Language',
    `- Respond in ${safeDisplayValue(ctx.language)}, set by \`language\` in .aif.json. Delegates and their reports follow it too.`,
    '',
  ];
}

function planLine(ctx) {
  const plan = ctx.activePlan;
  if (!plan) return '- Plan: none';
  const details = [plan.title && `title ${safeDisplayValue(plan.title)}`, plan.status && `status ${safeDisplayValue(plan.status)}`]
    .filter(Boolean);
  return `- Plan: ${safeDisplayValue(plan.dir)}${details.length ? ` (${details.join(', ')})` : ''}`;
}

/** Rule files shipped beside the hooks, development rules first. */
function ruleFiles(ctx) {
  let names;
  try {
    names = fs.readdirSync(ctx.rulesDir).filter(name => name.endsWith('.md')).sort();
  } catch {
    return [];
  }
  return [...names.filter(name => name === DEV_RULES_FILE), ...names.filter(name => name !== DEV_RULES_FILE)];
}

function rulesPointers(ctx) {
  const files = ruleFiles(ctx);
  const lines = [];
  if (files.includes(DEV_RULES_FILE)) {
    lines.push(`- Read and follow development rules: ${safeDisplayValue(path.join(ctx.rulesDir, DEV_RULES_FILE))}`);
  }
  const others = files.filter(name => name !== DEV_RULES_FILE);
  if (others.length) {
    lines.push(`- Situational rules in ${safeDisplayValue(ctx.rulesDir)}: ${others.join(', ')}. Open one when its situation applies.`);
  }
  return lines;
}

function markdownRule(ctx) {
  const plans = safeDisplayValue(ctx.plansDir);
  const docs = safeDisplayValue(ctx.docsDir);
  return [
    `- Markdown files go in Plans → ${plans} or Docs → ${docs}.`,
    `- Do not create markdown files outside ${plans} or ${docs} unless the user asks for it.`,
  ];
}

function pathsSection(ctx) {
  return [
    '## Paths',
    `Reports: ${safeDisplayValue(ctx.reportsDir)} | Plans: ${safeDisplayValue(ctx.plansDir)} | Docs: ${safeDisplayValue(ctx.docsDir)}`,
    '',
  ];
}

function planContextSection(ctx) {
  const lines = ['## Plan Context', planLine(ctx), `- Reports: ${safeDisplayValue(ctx.reportsDir)}`];
  if (ctx.branch) lines.push(`- Branch: ${safeDisplayValue(ctx.branch)}`);
  lines.push('');
  return lines;
}

function namingSection(ctx, type = '{type}') {
  const report = path.join(ctx.reportsDir, `${type}-${ctx.namePattern}.md`);
  const planDir = path.join(ctx.plansDir, ctx.namePattern);
  return [
    '## Naming',
    `- Report: \`${report}\``,
    `- Plan dir: \`${planDir}/\``,
    ...(type === '{type}' ? ['- Replace `{type}` with: agent name, report type, or context'] : []),
    '- Replace `{slug}` in pattern with: descriptive-kebab-slug',
  ];
}

/** The SessionStart block. */
function buildSessionContext(ctx) {
  return [
    '## Session',
    `- Project: ${safeDisplayValue(ctx.root)}`,
    '',
    ...languageSection(ctx),
    '## Rules',
    ...rulesPointers(ctx),
    ...markdownRule(ctx),
    '',
    ...pathsSection(ctx),
    ...planContextSection(ctx),
    ...namingSection(ctx),
  ].join('\n');
}

/** The SubagentStart block, named for the delegate's own reports. */
function buildSubagentContext(ctx, { agentType, agentId, cwd }) {
  const type = /^[A-Za-z0-9_-]{1,64}$/.test(agentType || '') ? agentType : 'agent';
  return [
    `## Subagent: ${safeDisplayValue(agentType || 'unknown')}`,
    `ID: ${safeDisplayValue(agentId || '')} | CWD: ${safeDisplayValue(cwd)}`,
    '',
    '## Context',
    planLine(ctx),
    `- Reports: ${safeDisplayValue(ctx.reportsDir)}`,
    `- Paths: ${safeDisplayValue(ctx.plansDir)} | ${safeDisplayValue(ctx.docsDir)}`,
    '',
    ...languageSection(ctx),
    '## Rules',
    `- Reports → ${safeDisplayValue(ctx.reportsDir)}`,
    '- KISS / DRY. Full requested scope, nothing extra. YAGNI only if the delegated task explicitly passes --yagni (this rules line does not count)',
    '- Concise, list unresolved Qs at end',
    ...rulesPointers(ctx),
    '',
    ...namingSection(ctx, type),
  ].join('\n');
}

/**
 * The UserPromptSubmit block: the development rules themselves, then the
 * current plan and naming, so they stay in view through a long session.
 */
function buildReminderContext(ctx, { maxRulesBytes = 8192 } = {}) {
  let rules = '';
  try {
    rules = fs.readFileSync(path.join(ctx.rulesDir, DEV_RULES_FILE), 'utf8').trim();
  } catch { /* no rules file: the reminder still carries plan and naming */ }
  if (Buffer.byteLength(rules, 'utf8') > maxRulesBytes) {
    rules = `${Buffer.from(rules, 'utf8').subarray(0, maxRulesBytes).toString('utf8')}\n[truncated]`;
  }
  return [
    ...(rules ? [rules, ''] : []),
    ...languageSection(ctx),
    ...planContextSection(ctx),
    ...namingSection(ctx),
  ].join('\n');
}

module.exports = {
  buildReminderContext,
  buildSessionContext,
  buildSubagentContext,
  planLine,
};
