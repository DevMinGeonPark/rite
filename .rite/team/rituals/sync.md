# Ritual: Sync

**Trigger:** `/rite-sync`
**Driver:** Scribe

## Purpose
Synchronize project memory and prepare external-facing summaries so the
documentation matches what was actually built.

## Steps
1. Read the current project's artifacts, reviews, and evidence.
2. Update `sync/changelog.md` from completed tasks and their evidence.
3. Generate or update `sync/pr-description.md` (what/why/risk/testing).
4. Update `.rite/context/decisions.md` if decisions changed; reference ADRs.
5. Update `status-report.md`.
6. Keep unresolved risks visible — never silently drop them.

## Outputs
- `sync/changelog.md`
- `sync/pr-description.md`
- updated `.rite/context/decisions.md`
- updated `status-report.md`

## Hard rules
- Documentation must match the implementation and the evidence.
- Unresolved risks stay visible.
