# Evidence Card: task-001-run-tests

## Task
task-001-run-tests

## Owner
builder

## Reviewer
verifier

## Summary
`validate --run-tests` runs the configured `commands.test` and gates on its real
exit code; a card claiming PASS while the command fails is flagged as
hallucinated evidence.

## Changed Files
- src/core/exec.ts
- src/commands/validate.ts
- templates/rite/config.yaml (+ .rite/config.yaml)
- src/__tests__/run-tests.test.ts

## Acceptance Criteria Mapping
- [x] config gains `commands.test`; `--run-tests` without it → clear error — `run-tests.test.ts` › "missing commands.test"
- [x] exit 0 passes, exit != 0 → exit 1 — `run-tests.test.ts` › "passing/failing command"
- [x] evidence PASS while real command fails → error — `run-tests.test.ts` › "hallucinated evidence"
- [x] without `--run-tests`, command is not run — `run-tests.test.ts` › "not run → still valid"

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Runs one repo-wide test command, not per-task; finer mapping is future work.
