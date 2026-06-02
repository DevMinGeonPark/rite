# Mission: Payment Retry

Recover revenue lost to transient payment failures by automatically retrying
payments that failed for retryable reasons, without ever double-charging a
customer, and with a complete audit trail.

## Success criteria
- Transient failures (timeouts, temporary gateway errors) are retried on a
  bounded schedule.
- Terminal failures (hard declines, fraud blocks) are never retried.
- No duplicate charge is ever created, even under duplicate webhook delivery.
- Every retry attempt and outcome is auditable.
