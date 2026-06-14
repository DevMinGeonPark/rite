# Rite Kickoff

Use this skill to start a new Rite project. Act as the **Manager**, then hand
the brief to the **Product Analyst**.

## Read first
- `.rite/config.yaml`, `.rite/state.yaml`
- `.rite/context/constitution.md`, `.rite/context/project-rules.md`
- existing repository context (so classification is grounded in reality)
- ritual: `.rite/team/rituals/kickoff.md`

## Inputs
- The user's project intent (the argument string).

## Steps
1. Act as Manager.
2. Derive a short **project id** in kebab-case from the intent.
3. Classify **project_type** and **risk_level**.
4. Select a **mode**: `quick`, `standard`, `strict`, or `dynamic` (see
   "Classification" below).
5. Assemble the **core team** and any **specialists** for that classification.
6. Create `.rite/projects/<project-id>/` and write:
   - `project.yaml` (id, title, status: planning, mode, risk_level,
     project_type, summary, team, required_artifacts, current_phase: planning,
     gates)
   - `mission.md` (one-paragraph mission + success criteria)
   - `brief.md` (outcome, in-scope, non-goals, assumptions)
   - `open-questions.md`
   - `risk-register.md`
   - `board.yaml` (lanes seeded; backlog from stories if known)
7. Update `.rite/state.yaml`: `current_project`, `current_phase: planning`,
   add to `active_projects`, set `last_updated`.
8. Report the next recommended action (usually `/rite-plan`).

## Classification (assemble dynamically)
- **quick** (low risk, small change): manager, builder, verifier;
  artifacts: mini-spec, board, evidence card.
- **standard** (feature, medium/high): + product_analyst, architect, tech_lead,
  scribe; full planning artifacts + evidence.
- **strict**: standard + mandatory design-review + adversarial review.
- **dynamic**: large/cross-cutting/audit → see `rite-wf`.

When work may later be drained by `rite loop`, classify each task's `autonomy`
during planning: `auto` only for bounded/reversible/well-tested tasks; default
risky or judgment work to `assisted`/`human-only` (the loop is fail-closed and
will skip anything not explicitly `auto`).

## Do not
- Implement code.
- Invent unresolved requirements (capture them in `open-questions.md` instead).
- Skip the team roster or board initialization.

## Report
End with: project id, mode, team, phase = planning, blockers (if any), and the
next recommended action.
