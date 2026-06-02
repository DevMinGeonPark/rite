# Handoff: Builder → Verifier (task-001-retry-policy)

## What changed
- `src/payment/retryPolicy.ts` — `classify` + `nextAttempt`.
- `src/payment/retryPolicy.test.ts` — 7 unit tests.

## How I verified
```text
pnpm test retryPolicy   # 7 passed
pnpm typecheck          # clean
```

## Acceptance mapping
- timeout retryable / hard decline terminal / max retries enforced — all covered
  by the tests named in the evidence card.

## For the Verifier
- Please confirm the terminal list is complete and the backoff cap is enforced.
- Diff: 2 files / ~140 lines (within budget).
