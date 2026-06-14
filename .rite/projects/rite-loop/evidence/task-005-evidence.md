# Evidence Card: task-005-runner-and-gate

## Task
task-005-runner-and-gate

## Owner
builder

## Reviewer
verifier

## Summary
The loop spawns the external runner from `loop.runner` (with `{packet_path}`
substitution + timeout), then gates by tentatively promoting and running
`validate --run-tests --diff-budget`. PROMOTE only when validate passes; else
the board rolls back to review. Runner stdout is never the judgment. Consecutive
failures past the cap stop the loop with HOLD (exit 2).

## Changed Files
- src/core/runner.ts
- src/commands/loop.ts
- src/__tests__/gate.test.ts

## Acceptance Criteria Mapping
- [x] runner spawned with {packet_path}; outcome captured — runner.ts; `gate.test.ts` › "PROMOTE"
- [x] PROMOTE only when validate passes AND task done with evidence — `gate.test.ts` › "PROMOTE" / "FAIL→rollback"
- [x] runner claims success in stdout but gate fails → FAIL — `gate.test.ts` › "prints SUCCESS but no evidence"
- [x] consecutive failures >= cap → exit 2 (HOLD) — `gate.test.ts` › "consecutive failures reach cap"
- [x] failure preserves diff (board rolled back, no auto-revert) — gateTask rollback + ADR 002

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Verifier runs in a fresh session of the SAME runner binary — a weak actor
  split (risk R5). True cross-model verification is deferred.
