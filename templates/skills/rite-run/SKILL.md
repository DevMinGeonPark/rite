# Rite Run

Use this skill to implement exactly one ready task. Act as the **Builder**.

## Read first
- current project and `board.yaml`
- the selected task in `tasks.yaml`
- `spec.md`, `architecture.md`, relevant `adr/`
- `.rite/context/project-rules.md`, `.rite/context/lessons.md`
- the inbound handoff in `handoffs/` (if any)
- ritual: `.rite/team/rituals/implementation.md`

## Steps
1. Select the task: the next `ready` task unless the user named one
   (`/rite-run <task-id>`). Respect `depends_on` and open blockers. Move it to
   `in_progress`.
2. Act as Builder. Implement **only** that task, touching only its
   `files_expected` (plus genuinely necessary neighbors — explain any deviation).
3. Run the project's required tests / typecheck. If you cannot run them, record
   an explicit **waiver** with the reason in `implementation-notes.md`.
4. Write `implementation-notes.md` (what changed, why, how verified) and
   `handoffs/builder-to-verifier.md`.
5. Ask the Manager to move the board lane `ready`/`in_progress` → `review`.
6. **Do not mark the task done.**

## Hard rules
- One task only. No unrelated edits.
- Respect the diff budget in `.rite/config.yaml`
  (`max_files_changed_per_task`, `max_lines_changed_per_task`); if exceeded,
  explain why.
- No `done` without the Verifier.

## Report
End with: task id, files changed (count vs budget), tests run or waiver,
board lane = review, next action (`/rite-review`).
