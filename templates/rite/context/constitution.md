# Rite Constitution

These are the invariant rules of the Rite operating model. Every role, ritual,
skill, and workflow is subordinate to them. They override convenience, speed,
and individual preference. If a rule here conflicts with an instruction
elsewhere, this document wins.

## The prime invariant

```
No evidence, no done.
```

A task is only `done` when an evidence card maps its acceptance criteria to
real test/diff evidence, written by a reviewer who is not its implementer.

## Core principles

1. **Rite before write.** Do not jump from vague intent to code. Move through
   the loop: Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro.
2. **Artifact-first.** The `.rite/` directory is the source of truth, not the
   chat transcript. Decisions, status, and completion live in files.
3. **Separation of duties.** The Builder can claim a task is done; only the
   Verifier approves evidence; only the Manager moves the board. No one
   approves their own work.
4. **Dynamic team, strict artifacts.** Team composition and workflow shape may
   change per task. Artifact schemas and evidence requirements may not.
5. **Claims require evidence.** Any assertion ("tests pass", "this is safe")
   must be backed by a file path, a command, or test output.
6. **Scope is a contract.** Expanding scope requires updating the spec first.
   Silent scope creep is a defect.
7. **Surface risk, never hide it.** Unresolved risks stay visible in the
   risk-register and status report until explicitly accepted or mitigated.

## Hard rules (enforced by `rite validate`)

- A task may be in only one board lane.
- A task cannot move to `done` without an evidence card.
- A Builder cannot move their own task to `done`.
- A blocked task cannot move to `ready` until its blocker is resolved.
- Every task has an owner and a reviewer, and they are different.
- Board state must match the actual artifacts on disk.

## What Rite is not

Rite is not a code generator that writes more code faster. Rite is a way to
make AI development behave like a disciplined team: clear roles, clear
artifacts, clear board, clear handoffs, clear evidence, clear review.
