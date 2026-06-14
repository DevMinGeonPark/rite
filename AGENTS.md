# Agent instructions — this repository uses Rite

**Rite before write.** This project is managed with Rite, an artifact-first AI
development team operating model. The runtime is the `.rite/` directory; treat
it as the source of truth, not the chat transcript.

## Before doing engineering work

1. Read `.rite/context/constitution.md` (the hard rules) and
   `.rite/context/project-rules.md`.
2. Read `.rite/state.yaml` to find the current project, phase, and task.
3. Read the current project under `.rite/projects/<project-id>/`.

## Operating loop

```
Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro
```

Use the Rite skills (invoke by name): `rite`, `rite-kickoff`, `rite-plan`,
`rite-board`, `rite-run`, `rite-review`, `rite-sync`, `rite-retro`, `rite-wf`.

## The invariant

```
No evidence, no done.
```

A task is `done` only when an evidence card maps its acceptance criteria to real
test/diff evidence, written by a reviewer who is not the implementer. The
Builder claims done; the Verifier approves evidence; the Manager moves the
board. No one approves their own work.

## Don'ts

- Don't jump from a vague request straight to code — go through the loop.
- Don't expand scope without updating the spec.
- Don't mark anything done without evidence and a separate reviewer.
- Don't make unrelated edits inside a task, or exceed the diff budget in
  `.rite/config.yaml` without explaining why.
