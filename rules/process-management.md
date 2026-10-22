# Process and Resource Management

Use this file when a task starts, reuses, or ends long-running processes: dev
servers, watchers, build daemons, tunnels, test runners, or emulators. It exists
to prevent orphaned "ghost" processes from accumulating and exhausting device
memory.

## The failure mode

Agents start a dev environment, then abandon it. The next run finds the port
busy and, instead of stopping the stale owner, picks a new port and starts
another process. Repeat, and the machine fills with duplicate processes and
held ports. Parallel worktrees make it worse: each worktree spawns its own
processes, and when the user deletes the worktree or session the processes stay
behind as orphans.

## Rules

- Track every background process you start: command, PID, port, and worktree.
  Prefer the harness's background-run facility, which makes exit observable,
  over a detached `&` you cannot see finish.
- Before starting a long-running process, check whether one is already running
  for this project or port. Reuse or stop it; do not spawn a duplicate.
- Bind to a deterministic port per project/worktree. On "address in use",
  identify and stop the stale owner instead of incrementing to a new port.
  Inspect with `lsof -i :PORT` / `ss -ltnp` on macOS/Linux, `netstat -ano` on
  Windows.
- Stop what you started when its task, session, or worktree ends. Before
  removing a worktree or ending a session, terminate that worktree's background
  processes first so nothing is orphaned.
- Reconcile periodically: list your running dev processes (`ps`, `lsof`) and
  stop the ones that no longer map to an active task or worktree.
- Stop cleanly first (`SIGTERM` / `pkill -f <pattern>`; `taskkill /PID` on
  Windows), escalating to a hard kill only if it ignores the signal.

## Safety

Only stop processes you started or clearly own. Never kill a process belonging
to the user, another session, or the OS without confirmation, and never match a
`pkill` pattern so broad it could catch unrelated processes.
