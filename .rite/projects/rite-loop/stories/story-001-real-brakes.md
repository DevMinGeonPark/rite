# Story 001: Make the brakes mechanical

**As** the loop runtime, **I want** test execution and diff budgets to be real
checks (not stated claims), **so that** an unattended agent cannot hallucinate
completion or silently creep scope.

Why first: autonomy's #1 failure mode is validation hallucination (R1) and #2
is scope creep (R4). The loop must not exist before its brakes do.

## Acceptance
- `rite validate --run-tests` executes `commands.test` and fails on non-zero.
- Stated `Test Result: PASS` with a really-failing command ⇒ validation error.
- Diff measured vs a base ref; budget exceeded without waiver ⇒ error.

## Tasks
- task-001-run-tests
- task-002-diff-budget

## Status
ready
