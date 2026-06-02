# Evidence Card: task-001-retry-policy

## Task
task-001-retry-policy

## Owner
Builder

## Reviewer
Verifier

## Summary
Implemented retry policy model with retryable/non-retryable failure classification.

## Changed Files
- src/payment/retryPolicy.ts
- src/payment/retryPolicy.test.ts

## Acceptance Criteria Mapping
- [x] timeout is retryable — `retryPolicy.test.ts` › "classifies timeout as retryable"
- [x] hard decline is not retryable — `retryPolicy.test.ts` › "hard decline is terminal"
- [x] max retry count is enforced — `retryPolicy.test.ts` › "stops after maxRetries"

## Tests Run
```text
pnpm test retryPolicy
pnpm typecheck
```

## Test Result
PASS (7 tests, 0 failures)

## Diff Budget
- files changed: 2 / 8
- lines changed: 140 / 500
- exceeded: false

## Reviewer Verdict
Approved.

## Remaining Risks
- Integration behavior with webhook duplicate delivery is covered in task-002.
