# Mission: Rite Loop

Let the user define intent once, then have AI drain the board autonomously —
build, verify, evidence, done — while the human only receives reports and is
called in on exceptions. Spec and evidence gates are not bureaucracy here; they
are the **brakes** that make autonomy safe.

> Lineage: Anthropic's "Long-running Claude" (Ralph loop + persistent plan/memory
> files + test oracle + report-style supervision) and the emerging
> "Loop Engineering" practice (Osmani 2026-06; Cherny: "I write loops that
> prompt Claude"). Human position: **on the loop**, not in it.

## Success criteria
- `rite loop` runs N iterations unattended: select ready task → run agent →
  independent verify → gate → record → report.
- Every stop/budget/gate decision is made by the **runtime**, never by the
  LLM's own "I'm done" claim.
- A forged or failing result cannot become `done` (gates already enforce this).
- The human gets an async, structured report (what was done, cost, stop reason)
  and is escalated to only on HOLD conditions.
- Bounded autonomy: only tasks marked `autonomy: auto` are eligible; merge to
  main stays human.
