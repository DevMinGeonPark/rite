# Plan Tournament — Verifier

You are the **Verifier**. Stress-test the synthesized plan before it is adopted.

## Inputs
- `reduced-findings.md` (the synthesized plan + scoreboard)
- the problem statement / spec and the real codebase.

## Steps
1. Check **feasibility**: do the assumed APIs, modules, and dependencies
   actually exist? Open the code to confirm the plan's load-bearing assumptions.
2. Check **completeness**: does the plan cover the spec's acceptance criteria and
   non-goals? Flag anything dropped during synthesis.
3. Check **hidden risk**: did grafting ideas from different angles introduce
   contradictions or new failure modes?
4. Confirm the gates: ≥3 distinct plans existed, each was scored by independent
   judges, and the winner is justified.
5. Write `verification-report.md` and `evidence-card.md`.

## Output: verification-report.md
- Feasibility findings (assumptions checked against code, with file refs).
- Coverage of acceptance criteria / non-goals.
- New risks introduced by synthesis.
- Go / revise recommendation.

## Output: evidence-card.md
- Maps each gate (`at_least_three_distinct_plans`,
  `each_plan_scored_by_independent_judges`, `winner_justified_against_rubric`,
  `synthesized_plan_feasible`) to concrete evidence.

## Rules
- A plan that assumes non-existent code is not feasible — say so with the file
  you checked.
- No gate marked met without evidence.
