# PRD: Rite Loop

## Problem
Rite v0.1 disciplines *each* task (plan → build → review → evidence), but a
human must trigger every step. The emerging practice (Anthropic long-running
agents; "loop engineering") shows the leverage now sits one layer up: design a
system that prompts the agent, instead of prompting it yourself. Rite has the
brakes (gates) but no engine.

## Users & jobs
- **Solo builder (primary, this machine):** wants to plan a project, start a
  loop over SSH, disconnect, and read a trustworthy report later.
- **Team using CI:** wants unattended task-draining whose "done" claims are
  mechanically checked, so a PR built overnight can be trusted enough to review.

## Requirements

### Functional
1. `rite loop` drains eligible tasks: select → run → verify → gate → record →
   report, repeating until a stop condition.
2. Eligibility: task `status: ready`, all `depends_on` done, no open blocker,
   `autonomy: auto`. Missing `autonomy` field ⇒ **not** eligible (fail-closed).
3. Each iteration runs the agent with a **fresh context packet** (constitution,
   project spec, the one task, lessons) — no ever-growing session.
4. Verification is a separate step that **actually executes** the configured
   test command; gate verdicts come from `rite validate` exit codes.
5. Gate verdicts: **PROMOTE** (evidence gate passed → task done) or **HOLD**
   (stop the loop, escalate with reasons). No silent retry past the failure cap.
6. Every run produces a structured report: iterations, per-task outcome, cost
   (if runner reports it), stop reason.

### Non-functional
- All stop conditions enforced in the CLI runtime; the agent cannot extend its
  own budget or declare itself done.
- Zero new npm dependencies (Node child_process + existing yaml/commander).
- Works headless over SSH; no GUI.

## Acceptance criteria (testable)
- Given two `auto` ready tasks and `--max-iterations 1`, exactly one task is
  attempted, then the loop stops with reason `iteration-cap`.
- Given no eligible tasks, `rite loop` exits 0 with reason `no-eligible-tasks`
  without spawning a runner.
- Given a runner whose changes fail `validate --run-tests`, the task is NOT
  moved to done; after `max_consecutive_failures` the loop stops with `hold`.
- Given a task without `autonomy: auto`, it is never selected.
- A loop report file exists after every run and names: tasks attempted,
  verdicts, stop reason.
- `rite validate --run-tests` fails (exit 1) when the configured test command
  fails, and records the command + exit code.

## Non-goals
See brief.md (no merge/deploy, no auto-rollback, no parallel fleet, no LLM
calls inside Rite).
