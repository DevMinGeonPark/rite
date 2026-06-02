# Ritual: Kickoff

**Trigger:** `/rite-kickoff "<project intent>"`
**Driver:** Manager → Product Analyst

## Purpose
Create a project, classify the work, assemble the team, and initialize artifacts.

## Steps
1. **Manager** classifies the work (project_type, risk_level).
2. **Manager** chooses a mode: `quick`, `standard`, `strict`, or `dynamic`.
3. **Manager** assembles core team + specialists for that classification.
4. **Product Analyst** drafts `brief.md` (outcome, scope, non-goals).
5. **Manager** initializes `board.yaml` and seeds `open-questions.md` /
   `risk-register.md`.
6. **Manager** reports current phase and the next recommended action.

## Outputs
- `project.yaml`
- `mission.md`
- `brief.md`
- `board.yaml`
- `open-questions.md`
- `risk-register.md`
- updated `.rite/state.yaml` (current_project, current_phase = planning)

## Gate to leave kickoff
- brief exists, mission is clear, board initialized, team assigned.
