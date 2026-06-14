# Spec: Rite Loop

## 1. Config additions (`.rite/config.yaml`)

```yaml
commands:
  test: "npm test"            # ground-truth verification command (required for --run-tests / loop)

loop:
  enabled: true
  runner: "claude -p {packet_path} --output-format json"   # external headless agent; {packet_path} substituted
  max_iterations_per_run: 6        # hard cap, runtime-enforced
  max_consecutive_failures: 2      # then HOLD + stop
  iteration_timeout_minutes: 30    # kill runner past this
  on_report: ""                    # optional shell hook invoked with the report path
```

All keys read by code (no dead config). Missing `loop.runner` ⇒ `rite loop`
exits with a clear config error.

## 2. Task schema addition (`tasks.yaml`)

```yaml
- id: task-001-...
  autonomy: auto        # auto | assisted | human-only ; ABSENT ⇒ treated as assisted
```

`rite loop` selects only `autonomy: auto`. `validate` warns when a done task
never declared autonomy (hygiene).

## 3. `rite validate --run-tests`

- Reads `commands.test`; absent ⇒ error in this mode.
- Executes it (child_process, inherited cwd = repo root, captured output).
- Exit code ≠ 0 ⇒ validation **error**: "configured test command failed".
- Records `{command, exitCode, durationMs}` in the report output. The evidence
  card's stated `Test Result` must agree with reality: stated PASS + real FAIL
  ⇒ error (hallucinated evidence).

## 4. Diff budget measurement (loop gate + `validate --diff-budget <base-ref>`)

- `git diff --numstat <base>` → files changed / lines changed.
- Compare to `budgets.max_files_changed_per_task` / `max_lines_changed_per_task`.
- Exceeded and no waiver note in the evidence card ⇒ gate error.

## 5. `rite loop` algorithm

```
run-id = loop-<timestamp>
while iterations < max_iterations_per_run:
  task = next eligible task            # ready ∧ deps done ∧ no open blocker ∧ autonomy:auto
  if none: stop(reason=no-eligible-tasks)
  packet = render run packet           # see §6
  result = spawn runner (timeout)      # external agentic loop does gather→act→verify
  verdict = gate(task):                #   runtime judgment, not runner's claim:
      rite validate --run-tests --diff-budget <iteration-base>
      task in done lane with complete evidence card?  → PROMOTE
      else                                            → FAIL
  if PROMOTE: record + report, consecutive_failures = 0
  else: consecutive_failures++
        if consecutive_failures >= cap: stop(reason=hold, escalate)
stop(reason=iteration-cap) if loop exhausts
write loops/<run-id>/report.md + report.json ; append status_log ; fire on_report
```

- `--dry-run`: prints selected task + packet, spawns nothing.
- `--max-iterations N` overrides config downward only.
- Exit codes: 0 = completed/no-eligible, 2 = hold (escalation needed),
  1 = config/internal error.

## 6. Run packet (fresh context per iteration — Ralph pattern)

A single markdown file under `loops/<run-id>/packet-<task-id>.md` containing,
in order: constitution (hard rules excerpt), project spec.md, THE one task
(acceptance, files_expected, required_evidence), relevant lessons.md entries,
and the role instructions (act as Builder; then verify as Verifier per
rite-review; never move board to done yourself — write evidence; the runtime
gates done). Built **only** from `.rite/` files — no external/web content
(prompt-injection boundary).

## 7. Report (`loops/<run-id>/report.md` + `.json`)

- Per iteration: task id, verdict, validate summary, test command exit code,
  diff stats, runner-reported cost/turns when available.
- Run footer: stop reason, totals. JSON mirrors for machines; markdown ends
  with the standup block so `/rite-board` reads naturally after a run.

## 8. Out of scope (v0.2)
Auto-merge, auto-rollback, parallel workers, cross-model verification, web
context in packets.
