# Ritual: Implementation / Run

**Trigger:** `/rite-run next` (or `/rite-run <task-id>`)
**Driver:** Manager (selects) → Builder (implements)

## Purpose
Implement exactly one ready task — no more.

## Steps
1. **Manager** selects the next `ready` task (respecting dependencies and
   blockers), moves it to `in_progress`.
2. **Builder** reads `spec.md`, `architecture.md`, the task in `tasks.yaml`,
   `project-rules.md`, relevant ADRs, the inbound handoff, and past `lessons.md`.
3. **Builder** implements only that task, touching only its expected files.
4. **Builder** runs the required tests/typecheck, or records an explicit waiver.
5. **Builder** writes `implementation-notes.md` and a `handoffs/builder-to-verifier.md`.
6. **Manager** moves the task to `review`. The Builder does **not** mark it done.

## Outputs
- code diff (only for the assigned task)
- `implementation-notes.md`
- `handoffs/builder-to-verifier.md`
- board lane: `ready`/`in_progress` → `review`

## Hard rules
- One task only. No unrelated edits.
- Respect the diff budget in `.rite/config.yaml` (explain any overage).
- No `done` without the Verifier.
