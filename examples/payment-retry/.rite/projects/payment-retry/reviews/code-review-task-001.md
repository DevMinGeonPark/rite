# Code Review: task-001-retry-policy

**Reviewer:** Verifier  **Implementer:** Builder  (reviewer ≠ implementer ✓)

## Diff inspected
- `src/payment/retryPolicy.ts`, `src/payment/retryPolicy.test.ts`

## Checks
- [x] Tests actually ran (re-ran `pnpm test retryPolicy` → 7 passed)
- [x] Each acceptance criterion maps to a named test
- [x] Terminal failures never classified retryable
- [x] Backoff capped; `nextAttempt` returns null past `maxRetries`
- [x] No unrelated edits; within diff budget

## Verdict
**Approved.** Evidence card: `evidence/task-001-evidence.md`.

## Notes for next task
- task-002 must prove idempotency under duplicate delivery (the dominant risk R1).
