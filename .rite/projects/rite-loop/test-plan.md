# Test Plan: Rite Loop

All tests use node:test (zero new deps), pure-logic-first: selection, packet,
diff parsing, verdicts are testable without an LLM. Runner is faked with tiny
shell scripts (e.g. `exit 0` / `exit 1` / sleep-for-timeout).

## story-001 — real brakes
- run-tests: passing command → check passes; failing command → exit 1;
  missing `commands.test` with flag → config error; flag absent → no execution.
- **hallucination case:** card says PASS, command fails → error (R1 regression).
- diff parser: numstat fixtures (renames, binary lines) → {files, lines}.
- budget: under → pass; over w/o waiver → error; over with waiver → warn.

## story-002 — loop engine
- selection: ready+deps+no-blocker+auto → eligible; absent autonomy → NOT
  (fail-closed, R6); open blocker → not; dep not done → not.
- skeleton: --dry-run spawns nothing; no-eligible → exit 0 + report;
  --max-iterations 1 attempts exactly one.
- gate: fake runner writes evidence + moves board + tests pass → PROMOTE;
  fake runner prints "SUCCESS!" but no evidence → FAIL (runner text ≠ judgment,
  R1/R5); two consecutive FAILs with cap=2 → exit 2 (HOLD, R2/R3);
  timeout runner → counts as failure, diff preserved.

## story-003 — report
- report.md/.json exist for normal, dry, no-eligible, HOLD runs; stop reasons
  correct; status_log appended; on_report hook receives the path (fake hook
  writes a marker file).

## Adversarial regression (extends existing suite)
- Loop must never PROMOTE: forged card / failing tests / over-budget-no-waiver
  / blocked task / non-auto task. Each is a named test.
