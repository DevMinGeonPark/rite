# Story 002: Retry Queue

**As** the payment system, **I want** to execute due retries idempotently, **so
that** duplicate webhook deliveries never create duplicate charges.

## Acceptance
- a due retryable payment is charged exactly once
- duplicate trigger (`paymentId:attempt`) → one charge
- success/terminal stops retries; otherwise schedule next
- `retryCount` persisted

## Tasks
- task-002-retry-queue

## Status
ready
