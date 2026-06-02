# ADR 001: Centralized retry policy + idempotency key

- **Status:** Accepted
- **Date:** 2026-06-01
- **Deciders:** Architect, Tech Lead, idempotency-adversary

## Context
Failed payments must be retried only when transient, never double-charged, and
bounded. We need one source of truth for "is this retryable?" and a safe
execution model under at-least-once webhook delivery.

## Decision
1. A pure `RetryPolicy` module owns failure classification and backoff/limit
   calculation. No other module decides retryability.
2. Retry execution uses an idempotency key of `paymentId:attempt`. The charge
   path checks for a prior success on that key before charging.

## Consequences
- (+) Classification is centrally testable; taxonomy changes in one place.
- (+) Duplicate webhook deliveries cannot create duplicate charges.
- (−) Requires persisting attempt state and an idempotency lookup before charge.
- Follow-up: audit retention window (see open-questions, blocker-001).
