'use strict';
// oh-my-pi: agents and rules under ~/.omp/agent; the model becomes an omp
// role. Rules carry Cursor-style frontmatter, without which OMP ignores
// them. OMP has no hook surface, so no shared payload.
const path = require('path');
const { joinFrontmatter, loadAgents, loadModels, loadRules, ruleWithFrontmatter, setFrontmatterLine } = require('./common.cjs');

function render({ home }) {
  const base = path.join(home, '.omp', 'agent');
  const models = loadModels();
  const targets = loadAgents().map((agent) => {
    const role = models[agent.name] && models[agent.name].omp;
    const lines = role ? setFrontmatterLine(agent.lines, 'model', `model: ${JSON.stringify(role)}`) : agent.lines;
    return { path: path.join(base, 'agents', `${agent.id}.md`), owner: 'omp', kind: 'file', content: joinFrontmatter(lines, agent.body) };
  });
  for (const rule of loadRules()) {
    targets.push({ path: path.join(base, 'rules', `aif-${rule.name}.md`), owner: 'omp', kind: 'file', content: ruleWithFrontmatter(rule) });
  }
  return targets;
}

module.exports = { render };
