# Handoff: Tech Lead → Builder (task-001-retry-policy)

## Task
task-001-retry-policy — Add retry policy model.

## What to build
A pure `RetryPolicy` (see `spec.md` and ADR 001): `classify(failure)` and
`nextAttempt(attempt)`.

## Constraints
- Pure functions only; no I/O in this module.
- Touch only `src/payment/retryPolicy.ts` and its test.
- Diff budget: 8 files / 500 lines.

## Required evidence
- unit test output, typecheck output, acceptance mapping.

## Watch out for
- Hard declines must be terminal — do not classify any decline as retryable.
