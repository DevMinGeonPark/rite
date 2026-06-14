# Evidence Card: task-002-diff-budget

## Task
task-002-diff-budget

## Owner
builder

## Reviewer
verifier

## Summary
Diff budgets are measured for real: `git diff --numstat <base>` is parsed and
compared to config budgets; over-budget without a waiver fails validate.

## Changed Files
- src/core/diff.ts
- src/commands/validate.ts
- src/__tests__/diff-budget.test.ts

## Acceptance Criteria Mapping
- [x] numstat parsed into {files, lines}, pure + unit-tested — `diff-budget.test.ts` › "parseNumstat"
- [x] binary lines counted as files, 0 lines — `diff-budget.test.ts` › "binary files"
- [x] over budget → over; within → not over — `diff-budget.test.ts` › "checkBudget"
- [x] `--diff-budget <base>` over without waiver → exit 1; with waiver → warning — validate.ts diff block (manual + design)

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Waiver detection is a text match for "waiv" in evidence; could be tightened.
