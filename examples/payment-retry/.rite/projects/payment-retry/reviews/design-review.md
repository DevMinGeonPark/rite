# Design Review: Payment Retry

**Author:** Architect  **Challenger:** Adversarial Reviewer (idempotency-adversary)
**Also present:** Verifier, Tech Lead

## Challenges raised
1. **Duplicate webhook → double charge (R1).** Challenge: what if the same
   webhook is delivered twice between the success and the state write?
   → Resolution: idempotency key `paymentId:attempt` checked *before* charging,
   not after. Recorded in ADR 001. Must be proven by an integration test (task-002).
2. **Retry storm (R2).** Challenge: unbounded backoff under sustained gateway
   errors. → Resolution: `maxRetries` + capped exponential backoff.
3. **Audit retention (R5).** Challenge: how long do we keep audit records?
   → Unresolved — raised as blocker-001; gates story-003 only.

## Preserved disagreement
- The adversary still considers R1 the highest residual risk until task-002's
  duplicate-delivery test passes. Recorded, not closed.

## Decision
Proceed with task-001 and task-002. Hold story-003 until blocker-001 resolves.
