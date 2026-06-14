# Rite Plan

Use this skill to perform BMAD-style planning for the current Rite project,
before any code is written.

## Read first
- current project from `.rite/state.yaml`
- `mission.md`, `brief.md`, `open-questions.md`
- `.rite/context/project-rules.md`, `.rite/context/constitution.md`
- relevant role contracts in `.rite/team/roles/`
- ritual: `.rite/team/rituals/planning.md` (and `design-review.md` if risk ≥ medium)

## Steps
1. **Product Analyst** writes `prd.md` and `spec.md` (testable acceptance
   criteria, explicit non-goals). Resolve `open-questions.md` where possible;
   keep the rest visible.
2. **Architect** writes `architecture.md` and creates `adr/NNN-*.md` for each
   significant decision; updates `risk-register.md`.
3. **Tech Lead** writes `stories/` and `tasks.yaml`. Each task: small,
   explicit `depends_on`, `files_expected`, `acceptance`, and
   `required_evidence`, with an `owner` and a **different** `reviewer`.
   Set `autonomy:` per task — `auto` only for bounded, well-tested, reversible
   work the loop may run unattended; `assisted` or `human-only` for anything
   needing judgment (architecture, migrations, schema, security, scope calls).
   A missing `autonomy` field is treated as not-auto (fail-closed) by `rite loop`.
4. **Verifier** writes `test-plan.md`.
5. **Adversarial Reviewer** challenges the plan and strengthens
   `risk-register.md` (preserve disagreements).
6. **Manager** reconciles `board.yaml` (stories → backlog, first tasks → ready)
   and updates `.rite/state.yaml` (`current_phase`).

## Outputs
- `prd.md`, `spec.md`, `architecture.md`, `adr/` (if needed)
- `stories/`, `tasks.yaml`, `test-plan.md`, `risk-register.md`
- updated `board.yaml`

## Gate to leave planning
- acceptance criteria testable, non-goals defined, architecture exists, risks
  documented, every task has owner + reviewer + evidence requirements.

## Report
End with: current phase, files created/updated, blockers, next recommended
action (usually `/rite-board` then `/rite-run next`).
