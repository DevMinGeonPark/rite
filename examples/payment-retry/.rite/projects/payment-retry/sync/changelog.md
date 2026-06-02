# Changelog: Payment Retry

## Unreleased
### Added
- **Retry policy** (`task-001-retry-policy`): classify payment failures as
  retryable vs terminal and compute a bounded, capped backoff schedule.
  Evidence: `evidence/task-001-evidence.md`.

### In progress
- Retry queue (`task-002-retry-queue`): idempotent execution of due retries.

### Blocked
- Audit log (`story-003-audit-log`): awaiting audit retention window (blocker-001).
