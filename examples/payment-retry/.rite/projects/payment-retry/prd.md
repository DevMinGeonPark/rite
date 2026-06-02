# PRD: Payment Retry

## Problem
A measurable share of payments fail for transient reasons (gateway timeouts,
temporary 5xx, network blips). Today these are treated as final, so revenue is
lost and customers are not retried. We need automatic, safe retries.

## Users & jobs
- **Finance / Revenue:** wants recoverable failures recovered automatically.
- **Support:** wants to see why a payment failed and what was retried.
- **Engineering:** wants retries that cannot double-charge or loop forever.

## Requirements

### Functional
1. Classify each failed payment as **retryable** or **terminal**.
2. For retryable failures, schedule retries with bounded count and backoff.
3. Execute retries **idempotently**: a duplicate trigger (e.g. repeated webhook)
   must not create a second charge.
4. Persist retry count and outcome per payment.
5. Write an audit record for every attempt and final outcome.

### Non-functional
- No duplicate charges under at-least-once webhook delivery.
- Retry storms bounded by max attempts + backoff.
- Auditable and observable.

## Acceptance criteria (testable)
- Given a timeout failure, the payment is marked retryable and a retry is scheduled.
- Given a hard decline, the payment is marked terminal and **no** retry is scheduled.
- After `maxRetries` attempts, no further retries occur.
- Given two identical webhook deliveries, exactly **one** charge is attempted.
- Retry count is persisted and visible.

## Non-goals
See `brief.md`.
