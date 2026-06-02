# Risk Register: Payment Retry

| ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
|----|------|----------|------------|------------|-------|--------|
| R1 | Duplicate webhook → double charge | Critical | Medium | Idempotency key `paymentId:attempt`; pre-charge success check (ADR 001) | idempotency-adversary | mitigated (covered by task-002) |
| R2 | Retry storm overwhelms gateway | High | Low | `maxRetries` + capped exponential backoff | queue-reliability-reviewer | mitigated |
| R3 | Misclassifying a hard decline as retryable | High | Low | Centralized `RetryPolicy.classify`; explicit terminal list; unit tests | architect | mitigated (task-001) |
| R4 | Audit log retains sensitive card data | High | Low | Store only non-sensitive fields; review log schema | architect | open |
| R5 | Audit retention window unconfirmed | Medium | High | Confirm with compliance before building audit log | product_analyst | open (blocker-001) |

## Notes
- R1 and R3 are the dominant risks; both have tests as their proof, not prose.
- R4/R5 gate the audit-log story (story-003), not the retry policy/queue.
