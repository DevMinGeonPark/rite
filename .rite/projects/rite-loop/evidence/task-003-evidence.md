# Evidence Card: task-003-autonomy-field

## Task
task-003-autonomy-field

## Owner
builder

## Reviewer
verifier

## Summary
Task eligibility for the loop is fail-closed: only `autonomy: auto` tasks that
are ready, dependency-satisfied, and unblocked are selectable. Plan/kickoff
skills now instruct classifying autonomy.

## Changed Files
- src/core/select.ts
- src/__tests__/select.test.ts
- templates/skills/rite-plan/SKILL.md
- templates/skills/rite-kickoff/SKILL.md

## Acceptance Criteria Mapping
- [x] eligible = ready ∧ deps done ∧ no open blocker ∧ autonomy==auto — `select.test.ts` › "auto + ready + no deps"
- [x] absent autonomy → NOT eligible (fail-closed) — `select.test.ts` › "absent autonomy"
- [x] assisted/human-only excluded; resolved blocker ok — `select.test.ts` › "assisted/human-only", "resolved blocker"
- [x] plan/kickoff skills instruct autonomy classification — SKILL.md edits

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Classification itself is a human/agent judgment; the field only gates, it does
  not decide. Mis-classifying risky work as `auto` is a planning-time error.
