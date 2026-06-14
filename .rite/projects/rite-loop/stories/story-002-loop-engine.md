# Story 002: Loop engine

**As** a user, **I want** `rite loop` to select, run, verify and gate eligible
tasks unattended with runtime-enforced stop conditions, **so that** I define
intent once and the board drains itself.

## Acceptance
- Eligibility = ready ∧ deps done ∧ no open blocker ∧ `autonomy: auto`
  (absent field ⇒ not eligible).
- Fresh run packet per iteration, built only from `.rite/` files.
- Caps (iterations, consecutive failures, timeout) enforced in code; HOLD
  exits with code 2.
- Gate verdict from `rite validate` exit codes + board/evidence state, never
  from runner text.

## Tasks
- task-003-autonomy-field
- task-004-loop-skeleton
- task-005-runner-and-gate

## Status
backlog (blocked by story-001)
