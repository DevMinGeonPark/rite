# Rite

Rite is an artifact-first AI development team manager. Use this skill when the
user wants to plan, manage, implement, review, or document software work using a
team-like process.

## Core principle

**Rite before write.** Do not jump directly into implementation unless the
current project and task have enough artifacts and the board says the task is
`ready`.

## Source of truth

`.rite/` is the runtime. Always read it before acting:

- `.rite/config.yaml` — modes, budgets, defaults
- `.rite/state.yaml` — current project / phase / task
- `.rite/team/roster.yaml` and `.rite/team/roles/*.md` — who does what
- `.rite/context/constitution.md` — the hard rules (read this first)
- `.rite/context/project-rules.md` — project-specific rules
- `.rite/context/decisions.md`, `.rite/context/lessons.md` — memory
- `.rite/projects/<project-id>/` — the active project's artifacts

## Operating loop

```
Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro
```

## Routing

Rite is a family of skills. Pick the matching ritual:

| Intent | Skill |
|--------|-------|
| Start something new | `rite-kickoff` |
| Plan / design / break down | `rite-plan` |
| See status / standup | `rite-board` |
| Implement one task | `rite-run` |
| Verify + evidence | `rite-review` |
| Update docs / PR / decisions | `rite-sync` |
| Capture lessons | `rite-retro` |
| Large parallel/cross-cutting work | `rite-wf` |

If invoked as `rite <subcommand> ...`, delegate to the matching `rite-<subcommand>`
skill.

## Default behavior

When the user gives a **broad request**:
1. Act as Manager first.
2. Classify the work (type + risk).
3. Create or select a project.
4. Assemble a team.
5. Create the required artifacts for the chosen mode.
6. Recommend the next action.

When the user asks to **implement**:
1. Check `board.yaml`. 2. Select one `ready` task. 3. Act as Builder only for
that task. 4. Run or request validation. 5. Write implementation notes. 6. Move
to `review`, not `done`.

When the user asks to **review**:
1. Act as Verifier. 2. Check diff, tests, acceptance criteria. 3. Write the
evidence card. 4. Ask the Manager to update the board.

## Hard rules

- Builder cannot approve own work.
- Done requires evidence.
- Claims require file/test evidence.
- Scope changes require a spec update.
- High-risk work requires risk review.

## Always report what changed

End every turn with: current phase, active owner, blockers, and the single next
recommended action. Name every file you created or updated.
