# Codebase Understanding Phase

**When to skip:** If provided with scout reports, skip this phase.

## Core Activities

### Parallel Scout Agents
- Use `/aif-scout ext` (preferred) or `/aif-scout` (fallback) skill invocation to search the codebase for files needed to complete the task
- Each scout locates files needed for specific task aspects
- Wait for all aif-scout agents to report back before analysis
- Efficient for finding relevant code across large codebases

### Project Context Discovery

Do not assume a standard documentation corpus. Discover context by role:

1. Read the repository's loaded instructions and root README.
2. Follow its documentation navigation to locate current development and security rules, architecture or source maps, product requirements, and any design-system guidance relevant to the task.
3. Verify documented structure and behavior against current source, tests, manifests, and build configuration.
4. If navigation is absent, incomplete, or conflicting, use targeted scouts to locate the owning evidence and record the actual paths for the planner.

Documentation serves human and AI collaborators; current implementation evidence determines what is actually present.

### Environment Analysis
- Review development environment setup
- Analyze dotenv files and configuration
- Identify required dependencies
- Understand build and deployment processes

### Pattern Recognition
- Study existing patterns in codebase
- Identify conventions and architectural decisions
- Note consistency in implementation approaches
- Understand error handling patterns

### Integration Planning
- Identify how new features integrate with existing architecture
- Map dependencies between components
- Understand data flow and state management
- Consider backward compatibility

## Best Practices

- Start with documentation before diving into code
- Use scouts for targeted file discovery
- Document patterns found for consistency
- Note any inconsistencies or technical debt
- Consider impact on existing features
