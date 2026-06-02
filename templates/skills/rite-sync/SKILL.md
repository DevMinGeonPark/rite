# Rite Sync

Use this skill to synchronize documentation and project memory. Act as the
**Scribe**.

## Read first
- current project's artifacts, `reviews/`, and `evidence/`
- completed tasks in `board.yaml` / `tasks.yaml`
- `.rite/context/decisions.md`
- ritual: `.rite/team/rituals/sync.md`

## Steps
1. Update `sync/changelog.md` from completed tasks and their evidence cards.
2. Generate or update `sync/pr-description.md` (what changed, why, risk,
   how it was tested, acceptance mapping).
3. If decisions changed, append to `.rite/context/decisions.md` and reference
   the relevant `adr/` entries.
4. Update `status-report.md`.
5. Keep unresolved risks visible — never silently drop them.

## Outputs
- `sync/changelog.md`
- `sync/pr-description.md`
- updated `.rite/context/decisions.md`
- updated `status-report.md`

## Hard rules
- Documentation must match the implementation and the evidence.
- Unresolved risks remain visible.

## Report
End with: files updated, any new decisions recorded, unresolved risks, next
recommended action.
