# Architecture: Payment Retry

## Overview
```
payment failure ──▶ RetryPolicy.classify
                       │
              retryable│ terminal──▶ AuditLog (terminal) ; stop
                       ▼
            schedule retry (delayMs)
                       │
                       ▼
   RetryQueue (due) ──▶ idempotency check ──▶ charge ──▶ AuditLog
                       │                          │
                       └── already done? no-op ◀──┘
                       │
              success / terminal ─▶ stop
              retryable + attempts left ─▶ schedule next
```

## Key decisions
- **Classification is pure and centralized** in `RetryPolicy` so it is trivially
  testable and the retryable/terminal taxonomy lives in one place. (ADR 001)
- **Idempotency key = `paymentId:attempt`.** The charge path checks for a prior
  success on that key before issuing a new charge, making at-least-once webhook
  delivery safe. (ADR 001)
- **Bounded retries** via `maxRetries` + capped exponential backoff to prevent
  retry storms.

## Affected modules
- `src/payment/retryPolicy.ts` (new)
- `src/payment/retryQueue.ts` (new)
- `src/payment/auditLog.ts` (new or extend existing logging)
- webhook handler (wire-in only; behavior unchanged)

## Data model impact
- Add `retryCount`, `lastOutcome` to the payment record.
- Add an append-only `payment_retry_audit` table/collection.

## Migration & rollback
- Additive columns/table; backfill `retryCount = 0`.
- Rollback: feature flag `payment_retry_enabled`; disabling stops scheduling new
  retries without data loss.

## Security / performance
- No new external surface. Audit log must not store PAN/secret data.
- Retry volume bounded; queue throughput sized for worst-case backlog.

## Testability
- `RetryPolicy` is pure → unit tests.
- `RetryQueue` idempotency → integration test with duplicated trigger.
