# Test Plan: Payment Retry

## task-001 — RetryPolicy (unit)
- timeout → retryable
- gateway_5xx → retryable
- hard_decline → terminal (no retry scheduled)
- fraud_block → terminal
- backoff increases and is capped at `maxDelayMs`
- `nextAttempt` returns null once `attempt >= maxRetries`

## task-002 — RetryQueue (integration)
- a due retryable payment is charged once and recorded
- **duplicate trigger** (same `paymentId:attempt`) → exactly one charge
- on success, no further retry is scheduled
- on continued retryable failure with attempts remaining, next attempt scheduled
- `retryCount` persisted and incremented

## story-003 — AuditLog (deferred; blocked)
- every attempt writes one audit record (paymentId, attempt, decision, outcome)
- no sensitive card data in audit records

## Evidence requirements
- task-001: unit test output + typecheck + acceptance mapping
- task-002: integration test output + idempotency review
