# Ritual: Planning

**Trigger:** `/rite-plan`
**Driver:** Product Analyst → Architect → Tech Lead → Verifier → Adversarial Reviewer → Manager

## Purpose
Produce BMAD-style planning artifacts before any code is written.

## Steps
1. **Product Analyst** writes `prd.md` and `spec.md` from the brief and resolves
   what it can from `open-questions.md`.
2. **Architect** writes `architecture.md` and creates `adr/NNN-*.md` for any
   significant decision; updates `risk-register.md`.
3. **Tech Lead** decomposes into `stories/` and `tasks.yaml`, with explicit
   dependencies, expected files, per-task acceptance, and required evidence.
4. **Verifier** drafts `test-plan.md`.
5. **Adversarial Reviewer** challenges the plan and strengthens `risk-register.md`.
6. **Manager** reconciles `board.yaml` and reports.

## Outputs
- `prd.md`, `spec.md`, `architecture.md`, `adr/` (if needed)
- `stories/`, `tasks.yaml`, `test-plan.md`, `risk-register.md`
- updated `board.yaml`

## Gate to leave planning
- acceptance criteria testable, non-goals defined, architecture exists,
  risks documented, every task has owner + reviewer + evidence requirements.
