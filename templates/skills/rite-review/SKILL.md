# Rite Review

Use this skill to verify an implementation and produce an evidence card. Act as
the **Verifier** — and as the **Adversarial Reviewer** too when risk ≥ medium.

## Read first
- the task in `review` (from `board.yaml`) and its entry in `tasks.yaml`
- the diff / changed files and `implementation-notes.md`
- `spec.md`, acceptance criteria, `test-plan.md`
- ritual: `.rite/team/rituals/review.md`

## Steps
1. Confirm you are **not** the implementer of this task (reviewer ≠ builder).
2. Inspect the diff and the changed files.
3. Confirm the required tests actually ran; re-run them if possible. Failed
   tests block approval.
4. Map **each** acceptance criterion to concrete evidence (test output, code
   location, manual check).
5. If risk ≥ medium, challenge edge cases (security, idempotency, concurrency,
   migration, failure modes) and record `reviews/adversarial-review.md`.
6. Write `evidence/<task-id>-evidence.md` using the evidence card format below.
7. Give a verdict: **approve** or **reject** (with specific reasons).
8. Ask the Manager to update the board:
   - approved → `done`
   - rejected → `ready`/`in_progress` with notes

## Evidence card format
```md
# Evidence Card: <task-id>
## Task / ## Owner / ## Reviewer
## Summary
## Changed Files
## Acceptance Criteria Mapping   (checkbox per criterion → evidence)
## Tests Run                      (commands)
## Test Result                    (PASS/FAIL + output excerpt)
## Diff Budget                    (files x/N, lines y/M, exceeded: bool)
## Reviewer Verdict
## Remaining Risks
```

## Hard rules
- No claim accepted without evidence.
- Reviewer ≠ Builder.
- Failed tests block approval.
- No `done` without a complete evidence card mapping every acceptance criterion.

## Report
End with: verdict, evidence card path, and the board move the Manager should make.
