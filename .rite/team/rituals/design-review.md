# Ritual: Design Review

**Trigger:** during `/rite-plan` for medium/high-risk work, before implementation.
**Driver:** Architect (author) + Adversarial Reviewer (challenger) + Verifier

## Purpose
Pressure-test the architecture before committing to it. The author of a design
cannot be its sole approver.

## Steps
1. **Architect** presents `architecture.md` and the relevant ADRs.
2. **Adversarial Reviewer** attacks: data integrity, concurrency/idempotency,
   migration/rollback, security boundaries, performance, failure modes.
3. **Verifier** checks testability and that risks have mitigations or owners.
4. Disagreements are recorded in `reviews/design-review.md` — not erased.
5. **Manager** decides: proceed, revise, or escalate as a blocker.

## Outputs
- `reviews/design-review.md` (decisions + preserved disagreements)
- updated `risk-register.md`, possibly new `adr/` entries

## Gate
- no unmitigated high-severity risk enters implementation without explicit,
  recorded acceptance.
