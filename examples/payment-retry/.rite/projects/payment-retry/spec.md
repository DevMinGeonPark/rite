# Spec: Payment Retry

## Components
1. **RetryPolicy** — pure classifier + schedule calculator.
2. **RetryQueue** — persisted job that executes due retries idempotently.
3. **AuditLog** — append-only record of attempts and outcomes.

## RetryPolicy
- `classify(failure): 'retryable' | 'terminal'`
  - retryable: `timeout`, `gateway_5xx`, `network_error`
  - terminal: `hard_decline`, `fraud_block`, `invalid_card`
- `nextAttempt(attempt): { delayMs } | null`
  - exponential backoff, capped; returns `null` once `attempt >= maxRetries`.
- Config: `maxRetries` (default 4), `baseDelayMs`, `maxDelayMs`.

## RetryQueue
- A due retry is claimed with an **idempotency key** = `paymentId:attempt`.
- Before charging, check whether `idempotencyKey` has already succeeded; if so,
  no-op. This makes duplicate webhook delivery safe.
- On success/terminal failure, stop; otherwise schedule the next attempt via
  `RetryPolicy.nextAttempt`.
- Persist `retryCount` and `lastOutcome` on the payment.

## AuditLog
- One record per attempt: `paymentId`, `attempt`, `decision`, `outcome`, `at`.

## Acceptance mapping
| Criterion | Component |
|-----------|-----------|
| timeout retryable / hard decline terminal | RetryPolicy.classify |
| max retry count enforced | RetryPolicy.nextAttempt |
| duplicate webhook → one charge | RetryQueue idempotency key |
| retry count persisted | RetryQueue |

## Out of scope
Capture flow changes, new providers, customer notifications.
