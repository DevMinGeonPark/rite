# Story 001: Retry Policy

**As** the payment system, **I want** to classify failures and compute a bounded
retry schedule, **so that** only transient failures are retried, safely.

## Acceptance
- timeout / gateway_5xx / network_error → retryable
- hard_decline / fraud_block / invalid_card → terminal
- backoff is exponential and capped
- no retry past `maxRetries`

## Tasks
- task-001-retry-policy

## Status
done
