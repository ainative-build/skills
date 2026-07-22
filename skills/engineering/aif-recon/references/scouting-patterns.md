# Scouting patterns

Recipes for the wide sweep and for sizing/splitting the tree. Built-ins only.

## Size the space first

Before fanning out, learn how big the relevant area is:

```
git ls-files | wc -l                      # total tracked files
git ls-files '<dir>/**' | wc -l           # files under a candidate dir
grep -rl '<symbol>' --include='*.<ext>' . # files mentioning the target symbol
```

Small area (a handful of files) → sweep inline, no subagents. Large/multi-dir → split.

## Wide-sweep patterns

Prefer several narrow probes over one broad grep:

- **By symbol** — `grep -rn 'functionName\|TypeName' --include='*.ts'`
- **By file type in an area** — `git ls-files 'src/**/*.py'`
- **By feature keyword** — `grep -rl -i 'checkout\|payment' src/`
- **Entry points** — `git ls-files '**/{index,main,app,mod}.*'`
- **Config/contracts** — `git ls-files '**/*.{json,yaml,toml,proto,sql}'`

## Dependents (blast radius)

For each changed/target symbol, find who refers to it:

```
grep -rn "import.*<symbol>\|from .*<module>\|<symbol>(" --include='*.<ext>' .
```

Callers + importers = the set that can break if the target changes.

## Related tests

```
git ls-files '**/*{test,spec}*' | grep -i '<module>'
grep -rl '<symbol>' $(git ls-files '**/*{test,spec}*')
```

## Splitting for parallel subagents

- Split by top-level directory, not by file count, so each segment is coherent.
- Keep segments DISJOINT — no directory appears in two segments (avoids double work + merge conflict).
- Hand each subagent: its exact dirs/globs, the target it's confirming, and the report shape.
- Cap segment size to what fits a subagent's context — a package or two, not the whole monorepo.

## What NOT to do

- Don't return raw file contents — return paths + one-line relevance.
- Don't guess ownership from filenames — open the file to confirm.
- Don't let segments overlap — it wastes tokens and produces duplicate findings.
