# Rite Workflow

Use this skill for large, parallelizable, cross-cutting, or high-risk work
(repo-wide audits, migrations, cross-reviews, plan tournaments). Act as the
**Manager**.

## Read first
- `.rite/config.yaml` → `dynamic_workflows` budgets
- the current project (if any) and `.rite/context/project-rules.md`
- the workflow templates in `.rite/workflows/` (audit-sweep, migration-sweep,
  cross-review, plan-tournament)

## Decide first: is a dynamic workflow justified?
Promote to a dynamic workflow when **any** hold: ~25+ files touched, 4+ modules,
parallel review needed, cross-checking needed, migration/code-map task, security
audit, or large refactor. **Avoid** when the task is small, has ≤3 acceptance
criteria, has no existing tests, or is high write-risk without a plan. If not
justified, recommend the normal `rite-run` loop and stop.

## If justified
1. Pick the closest template under `.rite/workflows/<id>/` and copy it to
   `.rite/projects/<project-id>/workflow.yaml` (or a new `.rite/workflows/<id>/`).
2. Define `scope` (include/exclude globs), `agents` (roles + counts),
   `budgets` (parallel/total agents, `require_user_approval_before_edits`),
   `gates`, and `outputs`.
3. **Get user approval before any write phase.**

## Dynamic phases
```
Plan → Fan-out → Cross-check → Reduce → Evidence
```
1. **Plan** — split work into shards.
2. **Fan-out** — assign shards to specialized agents (parallel).
3. **Cross-check** — adversarially challenge findings; surface false
   positives/negatives.
4. **Reduce** — deduplicate, rank, merge; **preserve disagreements**.
5. **Evidence** — produce `reduced-findings.md`, `verification-report.md`, and an
   evidence card.

## Execution surface
- **Claude Code:** use the native multi-agent workflow / Task subagents to run
  the fan-out and cross-check phases in parallel.
- **Codex:** generate per-shard prompts plus reducer/verifier prompts and run
  them, then merge.

## Hard rules
- No write phase without explicit approval.
- Every finding requires code evidence (file + line).
- The Reducer must preserve disagreements, not flatten them away.
- High-severity findings must be cross-checked before they are reported as real.

## Report
End with: whether dynamic was justified, the workflow id, phase reached,
outputs produced, and the next recommended action.
