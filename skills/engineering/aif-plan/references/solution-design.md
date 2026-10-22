# Solution Design

## Core Principles

Follow these fundamental principles:
- **Full requested scope** - Design for everything the user asked for; never trim
  or defer it. Add nothing unrequested.
- **KISS** (Keep It Simple, Stupid) - Prefer simple solutions over complex ones
- **DRY** (Don't Repeat Yourself) - Avoid code duplication

With `--yagni`, additionally apply **YAGNI** (You Aren't Gonna Need It):
challenge and cut any scope not needed for the stated outcome.

## Design Activities

### Technical Trade-off Analysis
- Evaluate multiple approaches for each requirement
- Compare pros and cons of different solutions
- Compare approaches on their worst plausible case, not only the expected one
- Consider short-term vs long-term implications
- Balance complexity with maintainability
- Assess development effort vs benefit
- Recommend optimal solution based on current best practices

### Load-Bearing Assumptions
- List the assumptions the design fails without — not every assumption, only the
  ones that carry weight
- Mark which of those could realistically break within the life of this work;
  resolve the ones a read of source, tests, or live state can settle, and carry
  only the rest forward
- State the condition under which the chosen design stops meeting its success
  criteria
- When a load-bearing assumption stays unresolved, prefer the design that is
  cheapest to switch away from; note switching cost and any lock-in the design
  creates
- For each unresolved assumption, record in the phase's Risk Assessment the
  observable signal that it broke and the pre-decided response — adjust within
  the plan, or stop and replan

### Security Assessment
- Identify potential vulnerabilities during design phase
- Consider authentication and authorization requirements
- Assess data protection needs
- Evaluate input validation requirements
- Plan for secure configuration management
- Address OWASP Top 10 concerns
- Consider API security (rate limiting, CORS, etc.)

### Performance & Scalability
- Identify potential bottlenecks early
- Consider database query optimization needs
- Plan for caching strategies
- Assess resource usage (memory, CPU, network)
- Design for horizontal/vertical scaling
- Plan for load distribution
- Consider asynchronous processing where appropriate

### Edge Cases & Failure Modes
- Think through error scenarios
- Plan for network failures
- Consider partial failure handling
- Design retry and fallback mechanisms
- Plan for data consistency
- Consider race conditions
- Design for graceful degradation

### Architecture Design
- Create scalable system architectures
- Design for maintainability
- Plan component interactions
- Design data flow
- Consider microservices vs monolith trade-offs
- Plan API contracts
- Design state management

## Best Practices

- Document design decisions and rationale
- Consider both technical and business requirements
- Think through the entire user journey
- Plan for monitoring and observability
- Design with testing in mind
- Consider deployment and rollback strategies
