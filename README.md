# Rite

Rite is an artifact-first AI development team manager for Claude Code and Codex.

**Rite before write.**

Rite does not replace your coding agent. It gives your coding agent a team
operating model:

```
Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro
```

Small changes run through a tight task loop. Large changes can be promoted into
dynamic, multi-agent workflows. Every result must leave evidence.

The runtime is `.rite/`. Claude Code and Codex are just execution surfaces.

---

## Why

AI coding sessions often fail because the agent jumps directly from vague intent
to code. Rite makes the agent behave more like a real development team:

- **Product Analyst** writes requirements.
- **Architect** records decisions.
- **Tech Lead** breaks work into tasks.
- **Builder** implements one task at a time.
- **Verifier** checks evidence.
- **Adversarial Reviewer** attacks the risky assumptions.
- **Scribe** updates memory and PR docs.
- **Manager** keeps the board honest.

The single most important invariant:

```
No evidence, no done.
```

---

## Installation

Rite ships a small CLI whose only job is to install, regenerate, validate, and
inspect Rite files. From the repository you want to manage:

```bash
# from this repo
npm install
npm run build
node dist/cli.js init --tool both     # or: claude | codex

# or once published / linked as `rite`
rite init --tool both
```

- `--tool claude` → writes `.claude/` (+ `CLAUDE.md`)
- `--tool codex`  → writes `.agents/`, `.codex/`, and `AGENTS.md`
- `--tool both`   → writes all of the above, bridged via `CLAUDE.md → @AGENTS.md`

`init` never overwrites a file you have changed. Pass `--force` to regenerate.

---

## Claude Code usage

After `rite init --tool claude`, the skills live in `.claude/skills/<name>/SKILL.md`
and are invoked by their directory name:

```
/rite-kickoff "automatic retry for failed payments"
/rite-plan
/rite-board
/rite-run next
/rite-review
/rite-sync
/rite-retro
/rite-wf            # large / parallel / high-risk work
```

`/rite` is the umbrella skill that routes to the others. Legacy
`.claude/commands/<name>.md` shims are also written for older Claude Code
versions; on a name collision the skill wins.

> Verified: a Claude Code skill is a directory with an uppercase `SKILL.md`
> entrypoint; the **directory name** sets the `/command` (the frontmatter `name`
> is a display label that must match it). Side-effecting Rite rituals are marked
> `disable-model-invocation: true` so they only run when you ask.

## Codex usage

After `rite init --tool codex`, the same skills are written to
`.agents/skills/<name>/SKILL.md` — the cross-tool Agent Skills standard that
Codex scans. Invoke them by name:

```
$rite-kickoff "automatic retry for failed payments"
$rite-plan
$rite-board
$rite-run
$rite-review
$rite-sync
$rite-retro
```

Or pick them from the `/skills` menu. Repo-wide instructions live in `AGENTS.md`
(which Codex reads); side-effecting skills also get an `agents/openai.yaml` with
`allow_implicit_invocation: false` (the Codex analog of Claude's
`disable-model-invocation`).

> **Correction vs. a common assumption:** Codex's `.codex/rules/*.rules` are
> **command-execution policy** written in Starlark (`prefix_rule(...)`), *not*
> instructions or personas. Rite therefore puts its instructions in `AGENTS.md`
> and its personas in skills, and ships only an inert, commented
> `.codex/rules/rite.rules` you can opt into. Codex also does **not** read
> `.claude/` — that's why Rite writes a separate `.agents/skills/` tree.

---

## Core workflow

| Step | Command | Role | Output |
|------|---------|------|--------|
| Kickoff | `rite-kickoff "<intent>"` | Manager → Analyst | project + brief + board |
| Plan | `rite-plan` | Analyst/Architect/Tech Lead | prd, spec, architecture, tasks |
| Board | `rite-board` | Manager | standup status |
| Build | `rite-run [next\|<id>]` | Builder | one task, tests, notes → review |
| Review | `rite-review` | Verifier (+Adversary) | evidence card → done |
| Sync | `rite-sync` | Scribe | changelog, PR desc, decisions |
| Retro | `rite-retro` | Scribe | retro, lessons |

Separation of duties: the Builder claims done, the Verifier approves evidence,
the Manager moves the board, and no one approves their own work. `rite validate`
mechanically enforces the *checkable* parts of this — a `done` task needs a
complete evidence card whose reviewer is not the owner, owner ≠ reviewer, no
open-blocker task in `ready`, and board/`tasks.yaml` status agreement. The rest
(e.g. "code only after planning", diff budgets, real actor identity) are
conventions the agent follows, not code-enforced guarantees — see
`.rite/context/constitution.md` for the exact split.

---

## Artifacts

```
.rite/
  config.yaml            modes, budgets, defaults
  state.yaml             current project / phase / task
  team/
    roster.yaml          who owns what
    roles/*.md           role contracts (manager, builder, verifier, …)
    rituals/*.md         kickoff, planning, standup, review, sync, retro, …
  context/
    constitution.md      the hard rules (no evidence, no done)
    project-rules.md     your project's rules (edit this)
    code-map.md, decisions.md, lessons.md
  projects/<id>/
    project.yaml board.yaml tasks.yaml
    brief.md prd.md spec.md architecture.md adr/
    stories/ handoffs/ reviews/ evidence/ sync/
    risk-register.md test-plan.md status-report.md retro.md
  workflows/             dynamic workflow templates
```

See `examples/payment-retry/` for a complete, validating project.

---

## Team roles

Eight role contracts in `.rite/team/roles/` define what each role **owns**,
**can** do, **cannot** do, and **must check**: Manager, Product Analyst,
Architect, Tech Lead, Builder, Verifier, Adversarial Reviewer, Scribe. The team
is assembled dynamically per task (a copy tweak needs three roles; a payment
feature needs the full set; an audit promotes to a dynamic workflow).

---

## Dynamic workflows

When work is large, cross-cutting, parallelizable, or high-risk, `rite-wf`
promotes it to a multi-agent workflow with phases:

```
Plan → Fan-out → Cross-check → Reduce → Evidence
```

Four templates ship under `.rite/workflows/`:

- **audit-sweep** — repo-wide defect/security audit
- **migration-sweep** — codemod / migration across many files
- **cross-review** — multi-lens review of a change set
- **plan-tournament** — N independent plans, judged and synthesized

Each defines scope, agents, budgets, gates, and outputs, and **requires approval
before any write phase**. Findings require file+line evidence; the reducer must
preserve disagreements.

---

## Validation

```bash
rite validate     # consistency of .rite/ and all projects
rite doctor       # installed adapters, missing skills, active project
rite export --tool claude|codex|both   # regenerate adapters from templates
```

`rite validate` exits non-zero on any violation, so you can wire it into CI. It
checks that `config.yaml`/`state.yaml`/roster role files exist, the active
project exists, and board lanes are consistent — plus the evidence gate:

- **every done task has a real evidence card** — matched by the card's `## Task`
  value, requiring `Acceptance Criteria Mapping`, a PASS/waived `Test Result`,
  and a `Reviewer Verdict` (forged or empty cards fail);
- **no self-approval** — the card's reviewer ≠ the task owner;
- **owner ≠ reviewer** on every task;
- **no open-blocker task in `ready`**, and **board `done` ↔ `tasks.yaml` status
  agree**.

It does *not* run your tests or measure diffs — those stay conventions (see the
Constitution). This keeps `validate` honest: it gates structure and evidence
*form*, not the truth of the work.

---

## CLI reference

| Command | What it does |
|---------|--------------|
| `rite init --tool <claude\|codex\|both> [--force] [--cwd <dir>]` | install Rite into a repo |
| `rite validate [--cwd <dir>]` | validate runtime + projects |
| `rite doctor [--cwd <dir>]` | report adapters, skills, active project |
| `rite export --tool <…> [--cwd <dir>]` | regenerate tool adapters from templates |
| `rite validate --run-tests [--diff-budget <base>]` | run real tests + measure diff as gates |
| `rite loop [--dry-run] [--max-iterations <n>]` | autonomously drain ready (autonomy:auto) tasks |

## Architecture & development

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the internals: runtime
layout, per-platform skill rendering, the `validate` gate (enforced vs.
convention), the autonomous loop (`rite loop`), the code map, testing, and how
to extend Rite.

## License

MIT.
