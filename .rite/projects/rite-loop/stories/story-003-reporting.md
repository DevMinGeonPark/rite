# Story 003: Reports for a human on the loop

**As** the human supervisor, **I want** each run to end in a structured report
(markdown + JSON, optional notify hook), **so that** I supervise by reading,
not by prompting — and escalations carry enough context to act on
(anti-comprehension-debt).

## Acceptance
- `loops/<run-id>/report.md` + `report.json` exist after every run (incl.
  no-eligible-tasks runs).
- Report names: tasks attempted, verdicts, validate/test summaries, diff
  stats, stop reason; JSON mirrors it.
- status_log appended; optional `loop.on_report` hook fired with report path.

## Tasks
- task-006-loop-report

## Status
backlog (blocked by story-002)
