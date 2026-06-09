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

## Hard rules — mechanically enforced by `rite validate` (exit 1 on violation)

These are checked in code; a violation fails `rite validate` and can gate CI:

- A task may be in only one board lane.
- A `done` task must have a matching evidence card — found by the card's
  `## Task` value (not a loose text match), and the card must contain
  `## Acceptance Criteria Mapping`, a `## Test Result` that reads PASS (or an
  explicit waiver), and a `## Reviewer Verdict`. An empty or forged card fails.
- The evidence card's reviewer must not be the task owner (no self-approval).
- Every task has an owner and a reviewer, and they are different.
- A task with an **open blocker** may not sit in the `ready` lane.
- The board `done` lane and each task's `tasks.yaml` `status: done` must agree
  (board must match artifacts).
- Required runtime files and every roster `role_file` must exist.

## Conventions — followed by the agent, NOT mechanically enforced

`rite validate` does **not** check these; they depend on the agent honoring the
skill/role instructions. Do not mistake them for hard guarantees:

- **Rite before write** (artifacts created before code) — there is no timestamp
  or write-interception check.
- **Diff budget** (`max_files_changed_per_task`, `max_lines_changed_per_task`) —
  recorded in the evidence card by convention; no real diff is measured.
- **Actor-level separation** — `validate` compares role *labels*, not real actor
  identity. A single model playing both Builder and Verifier satisfies the
  label check; true independent review requires a separate agent/model
  (see `rite-wf`).
- **Tests actually ran** — `validate` reads the card's stated Test Result; it
  does not execute your test command.

## What Rite is not

Rite is not a code generator that writes more code faster. Rite is a way to
make AI development behave like a disciplined team: clear roles, clear
artifacts, clear board, clear handoffs, clear evidence, clear review.
