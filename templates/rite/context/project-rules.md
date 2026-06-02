# Project Rules

Project-specific rules that every role and skill must respect. Edit this file
to match your repository. Rite never overwrites it once you have changed it.

## Stack & conventions

- Language(s): <!-- e.g. TypeScript, Python -->
- Package manager / build: <!-- e.g. pnpm, uv, cargo -->
- Test command: <!-- e.g. pnpm test -->
- Typecheck/lint command: <!-- e.g. pnpm typecheck && pnpm lint -->
- Formatting: <!-- e.g. prettier, ruff format -->

## Coding rules

- Prefer boring, readable code that matches the surrounding style.
- Keep diffs small; respect the per-task diff budget in `.rite/config.yaml`.
- No unrelated edits inside a task.
- Add or update tests for behavior changes, or record an explicit waiver.

## Boundaries

- Files/areas that require extra review: <!-- e.g. src/payment/**, migrations/** -->
- Things that must never change without an ADR: <!-- e.g. public API, DB schema -->
- Secrets / config that must never be committed: <!-- e.g. .env -->

## Definition of done (in addition to the Constitution)

- [ ] Acceptance criteria met and mapped in an evidence card.
- [ ] Tests run (or waiver recorded).
- [ ] Diff budget respected (or excess explained).
- [ ] Reviewer (≠ implementer) approved.
