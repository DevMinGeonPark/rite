# Evidence Card: task-006-loop-report

## Task
task-006-loop-report

## Owner
builder

## Reviewer
verifier

## Summary
Every loop run writes `loops/<run-id>/report.md` + `report.json` (per-iteration
task, verdict, stop reason), appends `status_log`, and fires the optional
`loop.on_report` hook with the report path — so a human supervises by reading.

## Changed Files
- src/commands/loop.ts
- src/__tests__/report.test.ts

## Acceptance Criteria Mapping
- [x] report.md + report.json written for every run (incl. dry/no-eligible) — `report.test.ts` › "written for every run"
- [x] report names stop reason + iteration list — `report.test.ts` › "records the stop reason and iteration list"
- [x] status_log appended; on_report hook fired with path — `report.test.ts` › "on_report hook fires"

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Report notification is a shell hook; richer notifiers (Telegram, etc.) are
  left to the user to wire via on_report.
