# Intent Detection Logic

Detect user intent from natural language and route to appropriate workflow.

## Detection Algorithm

```
FUNCTION detectMode(input):
  # Priority 1: Explicit flags (override all)
  IF input contains "--interactive": RETURN "interactive"
  IF input contains "--fast": RETURN "fast"
  IF input contains "--parallel": RETURN "parallel"
  IF input contains "--auto": RETURN "auto"
  IF input contains "--no-test": RETURN "no-test"

  # Priority 2: Plan path detection
  IF input matches path pattern (.aif/plans/*, plan.md, phase-*.md):
    RETURN "code"

  # Priority 3: Keyword detection (case-insensitive)
  keywords = lowercase(input)

  IF keywords contains ["fast", "quick", "rapidly", "asap"]:
    RETURN "fast"

  IF keywords contains ["trust me", "auto", "yolo", "just do it"]:
    RETURN "auto"

  IF keywords contains ["no test", "skip test", "without test"]:
    RETURN "no-test"

  # Priority 4: Complexity detection
  features = extractFeatures(input)  # comma-separated or "and"-joined items
  IF count(features) >= 3 OR keywords contains "parallel":
    RETURN "parallel"

  # Default: authorized continuation
  RETURN "auto"
```

## Feature Extraction

Detect multiple features from natural language:

```
"implement auth, payments, and notifications" → ["auth", "payments", "notifications"]
"add login + signup + password reset"        → ["login", "signup", "password reset"]
"create dashboard with charts and tables"    → single feature (dashboard)
```

**Parallel trigger:** 3+ distinct features = parallel mode

## Mode Behaviors

| Mode | Skip Research | Skip Test | Review Gates | Auto-Approve | Parallel Exec |
|------|---------------|-----------|--------------|--------------|---------------|
| interactive | ✗ | ✗ | Explicit checkpoints | ✗ | ✗ |
| auto | ✗ | ✗ | No routine human stops | Within authorized scope | When independent |
| fast | ✓ | ✗ | No routine stops | ✗ | ✗ |
| parallel | Optional | ✗ | No routine stops | ✗ | ✓ |
| no-test | ✗ | ✓ | No routine stops | ✗ | ✗ |
| code | ✓ | ✗ | No routine stops | Per plan | Per plan |

**Review Gates:** Human approval checkpoints between major steps (see `workflow-steps.md`).
- Only explicit `--interactive` stops at review gates for human approval.
- Other modes continue within the authorized scope.

## Examples

```
"/aif-serve implement user auth --interactive"
→ Mode: interactive (explicit flag, stops at review gates)

"/aif-serve implement user auth"
→ Mode: auto (default, authorized continuation)

"/aif-serve <plan-dir>/phase-02-api.md"
→ Mode: code (path detected, continues within authorized scope)

"/aif-serve quick fix for the login bug"
→ Mode: fast ("quick" keyword, continues within authorized scope)

"/aif-serve implement auth, payments, notifications, shipping"
→ Mode: parallel (4 features, continues within authorized scope)

"/aif-serve implement dashboard --fast"
→ Mode: fast (explicit flag, continues within authorized scope)

"/aif-serve implement everything --auto"
→ Mode: auto (NO STOPS, implements all phases continuously)

"/aif-serve implement dashboard trust me"
→ Mode: auto ("trust me" keyword, NO STOPS)
```

**Note:** No flag and accepted plan execution continue within authorized scope. Explicit `--interactive`/`--chef` contracts remain active.

## Conflict Resolution

When multiple signals detected, priority order:
1. Explicit flags (`--fast`, `--auto`, etc.)
2. Path detection (plan files)
3. Keywords in text
4. Feature count analysis
5. Default (authorized continuation)
