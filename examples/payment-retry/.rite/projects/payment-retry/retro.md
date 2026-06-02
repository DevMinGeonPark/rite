# Retro: Payment Retry (interim, after task-001)

## What worked
- Centralizing classification in a pure module made task-001 fast to test and
  review; acceptance criteria mapped 1:1 to named tests.
- Separating the audit-log story let the blocked work (blocker-001) sit without
  stalling the retry policy/queue.

## What was hard
- The dominant risk (duplicate-charge, R1) can't be closed by the policy alone;
  it needs task-002's integration test. The adversary kept R1 open — correctly.

## Repeated-mistake watch
- Don't let "looks idempotent" stand in for a duplicate-delivery test.

## Lessons (also appended to .rite/context/lessons.md)
- For any "exactly once" claim, require a test that triggers the duplicate path —
  prose is not evidence.
