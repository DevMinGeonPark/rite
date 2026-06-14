# Evidence Card: task-004-loop-skeleton

## Task
task-004-loop-skeleton

## Owner
builder

## Reviewer
verifier

## Summary
`rite loop` selects the next eligible task, renders a fresh run packet from
`.rite/` files only, enforces the iteration cap, and supports `--dry-run`
(spawns nothing). A report is always written.

## Changed Files
- src/commands/loop.ts
- src/core/packet.ts
- src/cli.ts
- src/__tests__/loop-skeleton.test.ts

## Acceptance Criteria Mapping
- [x] `--dry-run` renders packet, spawns nothing, exit 0 — `loop-skeleton.test.ts` › "dry-run"
- [x] no eligible tasks → exit 0 + report — `loop-skeleton.test.ts` › "no eligible tasks"
- [x] `--max-iterations` cannot raise the config cap — `loop-skeleton.test.ts` › "cannot raise the config cap"
- [x] packet contains constitution + spec + ONE task, from `.rite/` only — packet asserted in dry-run test; renderPacket trust boundary

## Tests Run
```text
npm test
```

## Test Result
PASS (54 tests, 0 failures)

## Reviewer Verdict
Approved.

## Remaining Risks
- Sequential, one task at a time; no parallel worktrees (intentional for v0.2).
