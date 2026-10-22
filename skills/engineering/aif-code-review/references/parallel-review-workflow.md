# Parallel Review Workflow

List the edge cases the scope can hit — boundaries, error paths, concurrency, trust boundaries, resource lifetime — then dispatch parallel `aif-code-reviewer` agents to verify each group: <scope>$ARGUMENTS</scope>

Activate the skills the scope needs. Write findings in complete sentences and keep them short by selecting what matters, so a reviewer can act on the report without re-reading the diff.

## Workflow

### 1. Enumerate Edge Cases

Main agent deeply analyzes the scope to LIST all potential edge cases FIRST:
- Read repository instructions and follow the existing documentation navigation to find applicable requirements, architecture, and standards
- Use `/aif-scout` to find relevant files
- Confirm documentation claims against current source and tests in the review scope
- Cover each failure class below:
  - Null/undefined scenarios
  - Boundary conditions (off-by-one, empty, max values)
  - Error handling gaps
  - Race conditions, async edge cases
  - Input validation holes
  - Trust-boundary defects
  - Resource leaks
  - Untested code paths

**Output format:**
```markdown
## Edge Cases Identified

### Category: [scope-area]
1. [edge case description] → files: [file1, file2]
```

### 2. Categorize & Assign

Group edge cases by similar scope for parallel verification:
- Each category → one `aif-code-reviewer` agent
- Max 6 categories (merge small ones)
- Each reviewer gets specific edge cases to VERIFY, not discover

### 3. Parallel Verification

Launch N `aif-code-reviewer` subagents simultaneously:
- Pass: category name, list of edge cases, relevant files
- Task: **VERIFY** if each edge case is properly handled in code
- Report: which edge cases are handled vs unhandled

### 4. Aggregate Results

```markdown
## Edge Case Verification Report

### Summary
- Total edge cases: X
- Handled: Y
- Unhandled: Z
- Partial: W

### Unhandled Edge Cases (Need Fix)
| # | Edge Case | File | Status |
|---|-----------|------|--------|
```

### 5. Verification Review

After aggregation, verify accepted findings against the full scope:
- Re-check aggregated findings and unhandled edge cases
- Confirm each blocking issue has a concrete file/line and reproduction path
- Classify findings as Accept / Reject / Defer

### 6. Auto-Fix Pipeline

**IF** unhandled/partial edge cases found:
- Ask: "Found N unhandled edge cases. Fix with /aif-fix --parallel? [Y/n]"

### 7. Final Report
- Summary of verification
- Ask: "Commit? [Y/n]" → use `aif-git-manager`
