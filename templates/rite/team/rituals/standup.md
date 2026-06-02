# Ritual: Standup / Board

**Trigger:** `/rite-board` (or `/rite-standup`)
**Driver:** Manager

## Purpose
Show team status honestly, like a real engineering standup. Read-only with
respect to code; may update `board.yaml` / `status-report.md`.

## Steps
1. Read `.rite/state.yaml` and the current project's `board.yaml`.
2. Validate lane consistency (a task in only one lane; blockers visible).
3. Produce the standup summary.
4. Recommend the single next action.

## Standup format
```
Current project:
Current phase:
In progress:
Ready:
Blocked:
Needs review:
Done since last standup:
Next recommended action:
```

## Hard rules
- Never move a task to `done` without evidence.
- Never hide a blocker.
