# PR: Payment retry — retry policy (task-001)

## What
Adds a pure `RetryPolicy` that classifies payment failures (retryable vs
terminal) and computes a bounded, capped exponential backoff schedule.

## Why
Transient payment failures were treated as final, losing recoverable revenue.
This is the foundation for safe automatic retries (see PRD, ADR 001).

## How it was tested
```text
pnpm test retryPolicy   # 7 passed
pnpm typecheck          # clean
```
Acceptance criteria → tests mapped in `evidence/task-001-evidence.md`.

## Risk
- This PR is classification only; it does not execute charges. The double-charge
  risk (R1) is owned by task-002 and is explicitly out of scope here.

## Not included / follow-ups
- Retry queue execution (task-002).
- Audit log (story-003) — blocked on audit retention window (blocker-001).
