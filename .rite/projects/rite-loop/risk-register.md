# Risk Register: Rite Loop

| ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
|----|------|----------|------------|------------|-------|--------|
| R1 | **Validation hallucination** — agent declares tests passed without running them; loop marks done | Critical | High | `validate --run-tests` executes the configured test command and binds the real exit code (task-001). Gate refuses PROMOTE without it in loop mode. | verifier | open → closed by task-001 |
| R2 | **Runaway loop / cost blowup** (reported $12k single-session cases) | Critical | Medium | Runtime-enforced `max_iterations_per_run` + `max_consecutive_failures`; per-iteration runner timeout. Caps live in CLI code, not prompts. | cost-budget-auditor | open → closed by task-003/005 |
| R3 | **No-progress spin** — same failing action repeated | High | Medium | Consecutive-failure cap → HOLD escalation; iteration log makes spin visible. | loop-safety-adversary | open → closed by task-005 |
| R4 | **Scope creep per iteration** — agent edits beyond the task | High | Medium | Diff budget measured for real (task-002) against `files_expected` + config budgets; exceed without waiver → gate fails. | verifier | open → closed by task-002 |
| R5 | **Self-review weakness** — same model builds and verifies (actor split is label-level) | High | High | Verify runs as a *separate fresh runner session* with verifier prompt; limitation stated honestly in docs (Q4). True cross-model verify deferred. | adversarial_reviewer | open (partially mitigated) |
| R6 | **Irreversible actions** (migrations/deploy/destructive shell) executed unattended | Critical | Low | Loop only ever picks `autonomy: auto` tasks; kickoff/plan must classify risky tasks `assisted`/`human-only`. Runner inherits Rite skill rules (no deploy/merge). | manager | open → reduced by task-006 |
| R7 | **Prompt injection** via repo/external text consumed in packets | High | Low | Run packet is built only from `.rite/` artifacts + task spec; loop adds no web content. Documented trust boundary. | loop-safety-adversary | open (documented) |
| R8 | **Comprehension debt** — human "reports-only" loses context for escalations | Medium | High | Reports include decisions + reasons (not just commits); decisions.md/lessons.md stay mandatory in the loop's record step. | scribe | open (process) |

## Adversarial notes (strict mode)
- The single most dangerous combination is R1+R5: a self-verifying agent that
  *says* PASS. That is why task-001 (real test execution) is sequenced **before**
  the loop can gate anything, and why gate verdicts come from `rite validate`
  exit codes, never from runner output text.
- R6 is governed by classification, which is itself a judgment call — the loop
  defaults any task without an `autonomy` field to `assisted` (not eligible).
  Fail-closed, not fail-open.
