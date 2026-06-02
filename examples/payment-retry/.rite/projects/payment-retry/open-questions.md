# Open Questions: Payment Retry

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q1 | What is the audit-log retention window? | product_analyst | open | Pending compliance (blocker-001) |
| Q2 | Default `maxRetries` value? | tech_lead | resolved | 4, capped backoff |
| Q3 | Which failure categories are terminal vs retryable? | architect | resolved | See spec/ADR 001 |

> Open questions must not be silently converted into assumptions. Q1 blocks
> story-003 (audit log) but not task-001/task-002.
