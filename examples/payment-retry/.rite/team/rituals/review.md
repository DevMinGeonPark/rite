# Ritual: Review

**Trigger:** `/rite-review`
**Driver:** Verifier (+ Adversarial Reviewer for medium/high risk) → Manager

## Purpose
Verify implementation against the spec and produce an evidence card. The
reviewer must not be the implementer.

## Steps
1. **Verifier** inspects the diff and changed files for the task in `review`.
2. **Verifier** confirms the required tests actually ran (re-runs if possible).
3. **Verifier** maps each acceptance criterion to concrete evidence.
4. If risk is medium or higher, **Adversarial Reviewer** challenges edge cases
   and records `reviews/adversarial-review.md`.
5. **Verifier** writes `evidence/<task-id>-evidence.md` and gives a verdict.
6. **Manager** updates the board:
   - approved → `done`
   - rejected → back to `ready`/`in_progress` with notes

## Outputs
- `reviews/code-review-<task-id>.md` (or `qa-report.md`)
- `evidence/<task-id>-evidence.md`
- board lane move by the Manager

## Hard rules
- No claim accepted without evidence.
- Reviewer ≠ Builder.
- Failed tests block approval.
