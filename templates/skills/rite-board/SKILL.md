# Rite Board

Use this skill to show or update current team status, like a standup.

## Read first
- `.rite/state.yaml`
- current project's `board.yaml`, `tasks.yaml`, `risk-register.md`
- ritual: `.rite/team/rituals/standup.md`

## Steps
1. Read `.rite/state.yaml` to find the current project.
2. Read the project's `board.yaml`.
3. Validate lane consistency (a task in only one lane; every `done` task has an
   evidence card; blockers visible).
4. Summarize in the standup format below.
5. Update `status-report.md` (and `board.yaml` only if the Manager is moving a
   task as part of this turn).
6. Recommend the single next action.

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

## Do not
- Move a task to `done` without evidence.
- Hide blockers.

## Report
End with the standup summary and the next recommended action.
