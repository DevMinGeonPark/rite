# Brief: Rite Loop

## Outcome
The user kicks off and plans a project, types `rite loop`, closes the laptop,
and later reads a report of which tasks were completed with evidence — instead
of prompting the agent task by task.

## In scope
- `rite loop` orchestrator command in the existing TypeScript CLI:
  task selection, fresh-context run packets, runner spawn, gate, record, report.
- Hardening the gates autonomy depends on: **actually running tests**
  (`validate --run-tests`) and **measuring diff budgets** — promoting two
  documented conventions to mechanical checks.
- `autonomy: auto | assisted | human-only` task classification; loop only ever
  picks `auto`.
- Runtime-enforced stop conditions: iteration cap, consecutive-failure cap,
  no-eligible-tasks, HOLD escalation.
- Structured loop report (markdown + JSON) appended to project status.

## Non-goals (v0.2)
- No LLM calls inside Rite itself — the runner is an external headless agent
  command (e.g. Claude Code `claude -p`), configurable.
- No automatic merge/deploy to main — final integration stays human.
- No automatic ROLLBACK (git revert) — v0.2 gates are PROMOTE/HOLD; rollback is
  documented as future work (ADR 002).
- No multi-runner fleet/parallel worktrees — one task at a time, sequentially.
- No claim of full autonomy for judgment work — bounded tasks only.

## Assumptions
- Target repo is a git repository (isolation/rollback rely on it).
- A headless runner command exists on the machine (Claude Code CLI installed).
- Tasks produced by `rite plan` carry testable acceptance criteria — that is
  what makes unattended verification meaningful.
