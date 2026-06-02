# Brief: Payment Retry

## Outcome
When a payment fails for a transient reason, the system retries it automatically
on a bounded schedule and records every attempt, recovering revenue that would
otherwise be lost — without risk of double-charging.

## In scope
- Classifying payment failures as retryable vs terminal.
- A bounded, persisted retry schedule for retryable failures.
- Idempotent retry execution safe against duplicate webhook delivery.
- An audit log of attempts and outcomes.

## Non-goals
- Changing the checkout/payment-capture flow itself.
- Supporting new payment providers.
- A user-facing retry UI or customer notifications (future work).
- Dunning / subscription churn management.

## Assumptions
- The existing payment gateway returns a distinguishable error category.
- Webhooks may be delivered more than once (at-least-once delivery).

## Open questions
See `open-questions.md`.
