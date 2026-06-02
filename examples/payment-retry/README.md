# Example: payment-retry

A realistic, fully-populated Rite project you can inspect and validate. It shows
what a `standard`-mode feature looks like mid-flight: planning artifacts written,
one task **done with evidence**, one task **ready**, and one story **blocked**.

## What's here

```
.rite/
  config.yaml, state.yaml          # runtime (state points at payment-retry)
  team/                            # roster + role contracts + rituals
  context/                         # constitution, rules, decisions, lessons
  projects/payment-retry/
    project.yaml mission.md brief.md prd.md spec.md architecture.md
    adr/001-retry-policy.md
    stories/  tasks.yaml  board.yaml
    risk-register.md  test-plan.md  open-questions.md  status-report.md
    handoffs/  reviews/  evidence/task-001-evidence.md  sync/  retro.md
```

## The board state it demonstrates

| Lane | Item | Why |
|------|------|-----|
| done | `task-001-retry-policy` | has an evidence card mapping every acceptance criterion to a test |
| ready | `task-002-retry-queue` | unblocked; depends only on the done task-001 |
| backlog (blocked) | `story-003-audit-log` | blocker-001: audit retention window unconfirmed |

## Try it

```bash
cd examples/payment-retry
rite validate    # ✓ Valid — including "done task has evidence"
rite doctor      # active project: payment-retry
```

To see the gate fire, set `task-001-retry-policy` to `done` in a copy with the
evidence card removed and re-run `rite validate` — it will fail with
"no evidence, no done".
