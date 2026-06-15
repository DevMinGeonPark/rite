# Rite — Architecture & Development Guide

This document explains how Rite works internally: its runtime, modules, data
flow, the gates it enforces, and the autonomous loop. It is the reference for
contributors. For usage, see the top-level `README.md`.

---

## 1. What Rite is (in one paragraph)

Rite is a **repo-native, artifact-first AI development team manager** that runs
inside Claude Code and Codex. It is *not* a standalone agent runtime and makes
**no LLM calls itself**. It is a small TypeScript CLI plus a pack of
templates/skills that (1) scaffold a `.rite/` runtime into a repo, (2) render
per-platform skill adapters from a single source, (3) **validate** that the
project's artifacts and evidence are consistent, and (4) **drive an autonomous
loop** that drains ready tasks through external coding agents under
spec/evidence gates. The discipline ("Rite before write", "No evidence, no
done", separation of duties) lives partly in mechanical checks (`rite validate`)
and partly in the markdown role/skill contracts the agent follows.

```
Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro
```

---

## 2. Two planes: control vs. artifacts

| Plane | What | Where |
|-------|------|-------|
| **Control** (dynamic) | who's on the team, which mode, which workflow | chosen per project by the Manager role |
| **Artifacts** (strict) | schemas for board/tasks/evidence, gate rules | enforced by `rite validate` + templates |

The design rule: **dynamic control plane, strict artifact contracts.** Teams and
workflows flex; the artifact schema and evidence requirements do not.

---

## 3. Repository layout

```
rite/
  src/                     # the CLI (TypeScript, compiled to dist/)
    cli.ts                 # commander entry; defines init/validate/doctor/export/loop
    commands/
      init.ts              # scaffold .rite/ + render per-platform adapters
      validate.ts          # the gate: structure + evidence + tests + diff budget
      doctor.ts            # report adapters / missing skills / active project
      export.ts            # regenerate adapters from templates
      loop.ts              # autonomous loop orchestrator (the "loop engine")
    core/
      paths.ts             # locate templates + .rite/, skill-name constants
      fs.ts                # idempotent file ops (writeFileSafe, copyTree)
      yaml.ts              # read/parse/stringify YAML
      skills.ts            # render Claude/Codex skill frontmatter from manifest
      exec.ts              # runCommand — ground-truth command execution
      diff.ts              # git numstat parse + budget check
      select.ts            # fail-closed task eligibility for the loop
      packet.ts            # per-iteration run packet (fresh context)
      runner.ts            # spawn external headless runner
    __tests__/             # node:test suites (zero extra deps) + helpers.ts

  templates/               # the source of truth for what `init` installs
    rite/                  # the .rite/ runtime (config, state, team, context, workflows)
    skills/                # one canonical SKILL.md body per skill + manifest.yaml
    codex/                 # AGENTS.md, .codex/config.toml, .codex/rules/rite.rules

  examples/payment-retry/  # a complete, validating example project
  docs/ARCHITECTURE.md     # this file
  README.md
```

The CLI is intentionally small (commander + yaml, two runtime deps). Anything an
LLM should read at runtime lives under `templates/` (→ installed to `.rite/`),
never hardcoded in the CLI.

---

## 4. The runtime: `.rite/`

`rite init` copies `templates/rite/` into the target repo as `.rite/` — the
single source of truth. Nothing important lives in the chat transcript.

```
.rite/
  config.yaml              # modes, budgets, commands.test, loop.* settings
  state.yaml               # current_project / phase / task, active_projects
  team/
    roster.yaml            # role → owns[] + role_file
    roles/*.md             # 8 role contracts: Owns / Can / Cannot / Must-Check
    rituals/*.md           # kickoff, planning, standup, run, review, sync, retro, design-review
  context/
    constitution.md        # the hard rules (mechanically enforced vs. convention)
    project-rules.md, code-map.md, decisions.md, lessons.md
  workflows/               # 4 dynamic multi-agent workflow templates
    audit-sweep, migration-sweep, cross-review, plan-tournament
  projects/<id>/
    project.yaml board.yaml tasks.yaml
    brief.md prd.md spec.md architecture.md adr/
    stories/ handoffs/ reviews/ evidence/ sync/
    risk-register.md test-plan.md status-report.md retro.md
    loops/<run-id>/        # loop run packets + reports (gitignored)
```

Because state is on disk and git-tracked, a session can die and resume: the
board, evidence, and decisions survive. This is what makes long-running and
remote use viable.

### Key schemas

- **board.yaml** — `lanes` (backlog/ready/in_progress/review/qa/done), `owners`
  (primary/reviewer/status per task), `blockers[]`, `status_log[]`.
- **tasks.yaml** — `tasks[]` each with `id, status, owner, reviewer,
  depends_on[], files_expected[], acceptance[], required_evidence[], autonomy`.
- **evidence/<task>-evidence.md** — must contain `## Task` (canonical id),
  `## Owner`, `## Reviewer`, `## Acceptance Criteria Mapping`, `## Test Result`,
  `## Reviewer Verdict`.

---

## 5. Per-platform skill rendering (single source → two trees)

Claude Code and Codex scan **different directories** and Codex never reads
`.claude/`. Rite keeps one canonical skill body and synthesizes both adapters at
`init`/`export` time:

```
templates/skills/manifest.yaml      # name, description, side_effecting, allowed_tools
templates/skills/<name>/SKILL.md    # shared body (verbatim)
        │
        ├─ renderClaudeSkill  → .claude/skills/<name>/SKILL.md   (+ disable-model-invocation, allowed-tools)
        │                        + .claude/commands/<name>.md     (legacy shim)
        └─ renderCodexSkill   → .agents/skills/<name>/SKILL.md
           renderCodexOpenaiYaml → .agents/skills/<name>/agents/openai.yaml (allow_implicit_invocation:false)
```

`side_effecting: true` → Claude gets `disable-model-invocation: true` AND Codex
gets `allow_implicit_invocation: false` (the skill is user-triggered only).
Shared instructions go in `AGENTS.md`; `CLAUDE.md` bridges via `@AGENTS.md`
(Claude doesn't read `AGENTS.md`). See `src/core/skills.ts`.

> Correction baked into the design: Codex's `.codex/rules/*.rules` are Starlark
> *command-execution policy*, **not** instructions/personas — so Rite ships an
> inert commented `rite.rules` and puts instructions in `AGENTS.md` + skills.

---

## 6. The gate: `rite validate`

This is the load-bearing mechanical check (`src/commands/validate.ts`). Exit ≠ 0
on any error, so it can gate CI.

**Mechanically enforced (error → exit 1):**

- runtime files exist (`config.yaml`, `state.yaml`, roster + every `role_file`)
- active project in `state.yaml` exists
- a task is in only one board lane
- `owner ≠ reviewer` (tasks.yaml and board owners)
- **no-evidence-no-done**: a done task needs a card whose `## Task` *is* that id
  (no substring match), containing Acceptance Mapping + a PASS/waived Test
  Result + Reviewer Verdict; **self-approval** (card reviewer == owner) fails
- evidence requirement is keyed by **tasks.yaml membership** (closes the
  `story-*` rename bypass)
- board `done` lane ↔ tasks.yaml `status: done` must agree
- an open-blocker task may not sit in `ready`

**Optional, for autonomy:**

- `--run-tests` runs `commands.test` and gates on the **real exit code**; a card
  claiming PASS while tests fail is flagged as hallucinated evidence
- `--diff-budget <base>` measures `git diff --numstat` against `budgets.*`
  (waiver-aware)

**Convention only (NOT checked — honest about this in `constitution.md`):**
"Rite before write" ordering, diff budget unless `--diff-budget` is passed,
actor-level identity (labels are compared, not real actors), and whether tests
*actually* ran unless `--run-tests` is passed.

---

## 7. The autonomous loop: `rite loop`

Three layers, enforcement strictly outside-in (`ADR 002`):

```
③ rite loop (deterministic TypeScript) — select, packet, caps, gate, report
   ② harness — isolation + skills + validate as oracle
      ① inner agentic loop — EXTERNAL runner (e.g. claude -p): gather→act→verify
```

One iteration (`src/commands/loop.ts`):

1. **SELECT** — `nextEligible()` (`core/select.ts`): `ready ∧ deps done ∧ no
   open blocker ∧ autonomy:auto`. Missing `autonomy` ⇒ not eligible (fail-closed).
2. **PACKET** — `renderPacket()` (`core/packet.ts`): constitution + spec + the
   one task + lessons, rebuilt fresh from `.rite/` each iteration (Ralph
   pattern; built only from `.rite/`, never web — injection boundary).
3. **RUN** — `spawnRunner()` (`core/runner.ts`): the external runner from
   `loop.runner`, with `{packet_path}` substitution + timeout.
4. **GATE** — tentatively promote the task to done, then run `runValidate({
   runTests, diffBudgetBase })`. Pass → **PROMOTE**; fail → roll the board back
   to `review` → **FAIL**. The runner's stdout is never the judgment.
5. **RECORD/REPORT** — `loops/<run-id>/report.{md,json}` + `status_log`; fire
   the optional `loop.on_report` hook.

**Stop conditions are all runtime-enforced (the model cannot extend them):**
iteration cap, consecutive-failure cap → **HOLD (exit 2)**, no-eligible-tasks,
iteration timeout. Exit codes: `0` ok/no-eligible, `2` hold (escalate), `1`
config/internal error.

**Bounded by design:** only `autonomy: auto` tasks run unattended; no
merge/deploy; no auto-rollback (failed diff is preserved for inspection); one
task at a time.

---

## 8. Code map (module responsibilities)

| Module | Pure? | Responsibility |
|--------|-------|----------------|
| `core/paths.ts` | yes | find templates/`.rite/`, skill-name list |
| `core/fs.ts` | yes | `writeFileSafe` (never overwrite w/o force), `copyTree`, `walkFiles` |
| `core/yaml.ts` | yes | YAML read/parse/stringify |
| `core/skills.ts` | yes | render Claude/Codex frontmatter + command shim + openai.yaml |
| `core/exec.ts` | no | `runCommand` (spawnSync) — the ground-truth oracle |
| `core/diff.ts` | mixed | `parseNumstat` (pure) + `gitDiffStat` + `checkBudget` |
| `core/select.ts` | yes | loop eligibility (fail-closed) |
| `core/packet.ts` | yes | render run packet |
| `core/runner.ts` | no | spawn external runner, parse cost/turns from JSON |
| `commands/init.ts` | no | scaffold + render adapters, idempotent |
| `commands/validate.ts` | no | the gate (§6) |
| `commands/loop.ts` | no | the loop engine (§7) |
| `commands/doctor.ts` | no | health report |
| `commands/export.ts` | no | regenerate adapters |

Pure logic (selection, packet, diff parse, frontmatter render) is separated from
process/FS so it unit-tests without an LLM, git, or disk.

---

## 9. Testing

`npm test` = `tsc && node --test dist/__tests__/*.test.js` (Node's built-in test
runner, **zero extra deps**). 54 tests across:

- pure: `skills`, `fs`, `diff-budget`, `select`
- gate: `validate` (incl. 8 adversarial regressions — forged card, substring
  cross-contamination, story-* bypass, self-approval, failing result,
  board/status mismatch, blocked-in-ready), `run-tests`
- loop: `loop-skeleton` (dry-run, no-eligible, cap), `gate` (PROMOTE/FAIL/HOLD,
  "runner says SUCCESS but no evidence → FAIL"), `report`

Integration tests build a temp repo from the real templates (`__tests__/helpers.ts`)
and use trivial shell commands (`true`/`false`/`echo`) as fake test commands and
runners — no LLM, no network.

---

## 10. Extending Rite

- **New skill:** add an entry to `templates/skills/manifest.yaml` + a
  `templates/skills/<name>/SKILL.md` body; `init`/`export` render both adapters.
- **New dynamic workflow:** add `templates/rite/workflows/<id>/` with
  `workflow.yaml`, planner/reducer/verifier prompts, `output-schema.json`.
- **New CLI command:** add `src/commands/<x>.ts` exporting `runX(opts)`, wire it
  in `cli.ts`. Keep pure logic in `core/` so it's testable.
- **New gate rule:** add it to `validateProject()` in `validate.ts` **and** a
  named adversarial test, **and** reconcile `constitution.md` (enforced vs.
  convention) — documentation drift is treated as a defect.

---

## 11. Key decisions (ADRs)

- **ADR 001** (`examples/payment-retry/.rite/.../adr/001`): centralized retry
  policy + idempotency key (example domain).
- **ADR 002** (`.rite/projects/rite-loop/adr/002`): external-enforcement loop —
  three layers, no inner LLM in Rite, PROMOTE/HOLD (rollback deferred),
  bounded autonomy via classification, fresh-context-per-iteration, reports not
  approvals. Informed by Anthropic "Building effective agents" /
  "Long-running Claude" and the 2026 "loop engineering" practice.

---

## 12. Honest limitations

- **Soft enforcement:** only `rite validate` is mechanical; ordering, budgets
  (unless flagged), and actor identity rely on the agent honoring contracts.
- **Weak actor split:** the loop's verifier is a fresh session of the *same*
  runner binary — true cross-model verification is future work.
- **Bounded autonomy:** unattended runs are reliable only for bounded,
  well-tested, reversible tasks; judgment work must be `assisted`/`human-only`.
- **Sequential loop:** one task at a time; no parallel worktrees yet.
- **"Loop engineering"** is a 2026 neologism — the pattern is real, the name is
  not yet settled. Rite adopts the pattern, not the branding.
