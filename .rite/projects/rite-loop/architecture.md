# Architecture: Rite Loop

## Three layers (never mixed) — ADR 002

```
┌─ ③ rite loop (NEW: outer orchestrator, src/commands/loop.ts) ─────────┐
│   owns: task selection, packets, budgets, stop conditions, gate,      │
│         record, report. Deterministic TypeScript — no LLM inside.     │
│  ┌─ ② harness (existing surfaces) ─────────────────────────────────┐  │
│  │   isolation (git branch/worktree), skills, validate as oracle   │  │
│  │  ┌─ ① inner agentic loop (external runner, e.g. claude -p) ──┐  │  │
│  │  │   gather context → act → self-verify → repeat            │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

Enforcement direction is strictly outside-in: ③ decides when ① starts, dies,
or is declared done. Runner text output is *information*; only `rite validate`
exit codes and board/evidence files are *judgment*.

## Modules

| Module | Responsibility |
|---|---|
| `src/commands/loop.ts` | orchestrator loop, stop conditions, escalation, report |
| `src/core/select.ts` | eligibility query over board.yaml + tasks.yaml (pure) |
| `src/core/packet.ts` | render run packet from `.rite/` artifacts (pure) |
| `src/core/runner.ts` | spawn external runner with timeout, capture JSON/exit |
| `src/core/diff.ts` | `git diff --numstat` parsing → budget check (pure parse) |
| `src/commands/validate.ts` | +`--run-tests` (execute `commands.test`), +`--diff-budget` |

Pure logic (selection, packet, diff parse, verdicts) is separated from process
spawning so the core is unit-testable without an LLM or git.

## Data & state
- All loop state on disk under the project: `loops/<run-id>/…` + board/status_log
  mutations — git-diffable, session-survivable (this is the external memory the
  long-running pattern requires).
- Fresh packet per iteration; no conversational carryover between tasks.

## Failure handling
- Runner timeout/crash ⇒ iteration FAIL (counts toward consecutive cap),
  partial diff left intact on the branch for human inspection (graceful
  degradation; no auto-revert in v0.2).
- HOLD exit code (2) is distinct so cron/CI wrappers can page a human.

## Security boundaries
- Packets sourced exclusively from `.rite/` + tasks — no fetched/web text.
- Loop never runs `git push`, merge, or deploy; report recommends, human acts.
- Runner inherits the repo's Rite skills, whose rules already forbid
  self-done/deploy.
