# Research & Analysis Phase

**When to skip:** If provided with researcher reports, skip this phase.

## Core Activities

### Parallel Researcher Agents
- Spawn multiple `aif-researcher` agents in parallel to investigate different approaches
- Wait for all aif-researcher agents to report back before proceeding
- Each researcher investigates a specific aspect or approach

### Sequential Thinking
- Use `aif-deep-thinking` skill for dynamic and reflective problem-solving
- Structured thinking process for complex analysis
- Enables multi-step reasoning with revision capability

### Documentation Research
- Read official documentation directly with the runtime's fetch capability
- Research plugins, packages, and frameworks
- Find latest technical documentation using llms.txt standard

### GitHub Analysis
- Use `gh` command to read and analyze:
  - GitHub Actions logs
  - Pull requests
  - Issues and discussions
- Extract relevant technical context from GitHub resources

### Remote Repository Analysis
When given a GitHub repository URL, read its README, docs and the relevant source directly (`gh repo view`, `gh api`, or the runtime's fetch capability).

### Debugger Delegation
- Delegate to `aif-debugger` agent for root cause analysis
- Use when investigating complex issues or bugs
- Debugger agent specializes in diagnostic tasks

## Best Practices

- Research breadth before depth
- Document findings for synthesis phase
- Identify multiple approaches for comparison
- Consider edge cases during research
- Note security implications early
