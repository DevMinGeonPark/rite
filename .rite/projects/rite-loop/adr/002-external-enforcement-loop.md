# ADR 002: External-enforcement loop engine (PROMOTE/HOLD, no inner LLM)

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** Architect, Adversarial Reviewer, Manager
- **Informed by:** Anthropic "Building effective agents" (explicit stop
  conditions, ground-truth feedback), "Long-running Claude" (Ralph loop, plan +
  memory files, test oracle, report-style supervision), Osmani "Loop
  Engineering" (2026-06, named layer above the harness), Fowler/Böckeler
  "harness engineering" (human **on** the loop).

## Context
Users want "AI develops, I read reports". Rite already has the brakes
(evidence gate, separation of duties, board) but no engine. Autonomy's known
failure modes — validation hallucination, runaway cost, no-progress spin,
scope creep — are exactly what kills naive loops.

## Decision
1. **Three-layer split.** Inner agentic loop = external headless runner
   (configurable command, default Claude Code `-p`); harness = isolation +
   skills + validate; outer = `rite loop`, deterministic TypeScript. Rite
   itself makes **no LLM calls**.
2. **External enforcement.** Iteration caps, failure caps, timeouts, gate
   verdicts and "done" all live in the CLI runtime. The runner's self-report is
   never a judgment input — only `rite validate` exit codes and on-disk
   artifacts are.
3. **Gate verdicts are PROMOTE / HOLD.** Clear pass promotes; anything else
   holds and escalates after the failure cap. **ROLLBACK (auto git revert) is
   deferred** — preserving the failed diff for human inspection is safer until
   promote/hold behavior is field-proven.
4. **Bounded autonomy via classification.** Only `autonomy: auto` tasks are
   eligible; the field's absence means *not eligible* (fail-closed). Judgment
   work (migrations, schema, security) must be classified assisted/human-only
   at planning time.
5. **Fresh context per iteration** (Ralph pattern): packet = constitution +
   spec + one task + lessons, rebuilt from `.rite/` files each time. No
   long-lived session; board/status/decisions files are the memory.
6. **Reports, not approvals.** Output is a structured run report (+ optional
   `on_report` hook); merge/deploy stays human. Human position: on the loop.

## Consequences
- (+) Polluted/hallucinated runner output cannot mark work done.
- (+) Cost and spin are capped by code paths the model cannot edit at runtime.
- (+) Same engine works for any runner CLI later (Codex headless etc.).
- (−) Sequential only; throughput bounded by one-task-at-a-time (v0.2 choice).
- (−) Verifier runs in a fresh session of the *same* runner binary — a weak
  actor split, honestly documented (risk R5); cross-model verify is future work.
- (−) Requires `commands.test` to be meaningful; projects without tests get a
  HOLD-heavy loop by design.
