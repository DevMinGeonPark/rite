# Lessons

Actionable lessons captured during `/rite-retro`. Future planning and review
should consult this file. Keep each lesson concrete enough to change behavior.

> Format: newest first. A lesson is not "we should be careful"; it is a
> specific change to a ritual, gate, or rule.

<!--
## YYYY-MM-DD — <lesson title>  (project: <id>)
- **What happened:**
- **Root cause:**
- **Change we are making:** (e.g. add a gate, expand a checklist, new project rule)
-->

## 2026-06-14 — Gate the loop by reusing `validate`, not by re-checking  (project: rite-loop)
- **What happened:** the autonomous loop needed a "done" judgment. Re-implementing
  evidence/test checks inside the loop would have drifted from `validate`.
- **Root cause:** two code paths deciding "done" = two definitions of done.
- **Change we are making:** the loop's gate tentatively promotes then calls
  `rite validate --run-tests --diff-budget`; the runtime's exit code is the only
  judgment. Any new gate added to `validate` automatically applies to the loop.

## 2026-06-14 — Make brakes real before adding autonomy  (project: rite-loop)
- **What happened:** validation hallucination (an agent claiming PASS) is the #1
  failure mode of unattended loops.
- **Root cause:** in supervised mode, "tests run" and "diff budget" were honest
  conventions, never executed/measured by code.
- **Change we are making:** sequence brake tasks (real test execution, diff
  measurement) *before* the engine that depends on them; never ship an
  autonomous driver before its mechanical stop conditions exist.

## 2026-06-14 — Fail-closed autonomy classification  (project: rite-loop)
- **What happened:** the loop must never pick up judgment work unattended.
- **Root cause:** an opt-out default (run unless marked unsafe) is one missing
  field away from running something dangerous.
- **Change we are making:** `autonomy` defaults to NOT eligible; only explicit
  `auto` runs unattended. Plan/kickoff skills must classify risky work
  `assisted`/`human-only`.

## 2026-06-09 — Verify platform/term assumptions before designing  (project: rite-loop)
- **What happened:** "loop engineering" sounded like an established practice.
- **Root cause:** acting on a buzzword without sourcing it risks building to a
  wrong mental model (it's a 2026-06 neologism, not a standard).
- **Change we are making:** research load-bearing terms/assumptions to primary
  sources before an ADR; adopt the *pattern*, cite it honestly, don't inherit
  the branding.

## 2026-06-04 — Document-code drift is a defect  (project: rite — validate)
- **What happened:** `constitution.md` claimed `validate` enforced rules it did
  not; adversarial review forged a one-line evidence card that passed.
- **Root cause:** docs described intent; code checked far less (substring match).
- **Change we are making:** any gate rule must land as (1) code in `validate`,
  (2) a named adversarial regression test, and (3) a reconciled split of
  "enforced vs convention" in `constitution.md`. Don't claim enforcement the
  code doesn't deliver.
