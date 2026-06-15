# Retro: Rite Loop (v0.2)

Dogfooding retro — Rite planned and built `rite loop` using its own
kickoff → plan → run → review → evidence process.

## What worked
- **Brakes-first sequencing.** Making test execution + diff budget real
  (task-001/002) *before* the loop engine meant the loop never had a chance to
  promote on hallucinated evidence. The dependency graph enforced the order.
- **Reusing `validate` as the gate.** `gateTask` tentatively promotes then runs
  `runValidate({runTests, diffBudget})` — so every gate (evidence, self-approval,
  board↔status, tests, diff) applied to the loop for free, with zero
  duplication. One source of truth for "done".
- **Pure-core split.** select/packet/diff-parse being pure let the loop be
  tested (PROMOTE/FAIL/HOLD, "runner says SUCCESS but no evidence → FAIL")
  without an LLM, git, or network — fast, deterministic, 54/54.
- **Fail-closed autonomy.** Defaulting missing `autonomy` to not-eligible meant
  the loop refused to build *itself* (rite-loop tasks are `assisted`) — the
  safe behavior fell out of the design instead of needing a special case.
- **Research before design.** Pinning "loop engineering" to its actual source
  (Osmani 2026-06; Cherny) and the Anthropic "Long-running Claude" mapping kept
  ADR 002 grounded instead of chasing a buzzword.

## What was hard / still weak
- **Actor split is label-deep.** The verifier is a fresh session of the *same*
  runner binary; "reviewer ≠ owner" is a string compare, not real independence.
  Genuine cross-model verification remains unbuilt.
- **No auto-rollback.** A failed iteration leaves its diff on the branch (we
  only roll the board back). Safer for inspection, but a long unattended run can
  accumulate dead diffs.
- **Soft enforcement remains.** Ordering ("Rite before write") and diff budget
  (unless `--diff-budget` is passed by the loop) still depend on the agent.

## Lessons captured
See `.rite/context/lessons.md` — the actionable ones are folded there.
