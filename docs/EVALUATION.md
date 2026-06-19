# Evaluating Rite — an objective, reproducible methodology

How do you objectively evaluate a **harness / governance layer** like Rite —
something that doesn't generate code but *gates results and enforces process*?
This document is the methodology, the first concrete experiment with confidence
intervals, the honest limits, and the roadmap to close them.

> TL;DR — Rite's evidence gate is treated as a **binary classifier of "done"
> claims**. The "reproducibility / determinism / controlled-A-B" axis is proven
> now (no LLM, no cost). The "generalization / self-eval-bias" axis is **not yet
> proven** and needs LLM A/B + a human gold set — stated below as a roadmap, not
> hidden.

---

## 1. Why standard code benchmarks don't apply

SWE-bench / Terminal-Bench / Aider measure whether a **model+runner produces a
correct patch**. Rite produces no patch — it decides whether a *done claim* is
trustworthy. Using SWE-bench resolution rate as "Rite's score" measures the
model, not Rite, and inherits that benchmark's contamination (SWE-bench Verified:
~30–33% solution leak, 59% of one model's failures were test defects). Those
benchmarks are only usable as a **fixed backend for a Rite on/off A/B**, never
as Rite's KPI.

The relevant literature argues precisely this "measurement imbalance" — success
rate is over-weighted while process / governance / evidence are under-measured
(arXiv 2506.02064), and **the harness can move scores as much as the model**
(Harness-Bench; Terminal-Bench: same model ±17% by scaffold).

## 2. Objectivity principles (how we avoid self-grading)

1. **No bare point estimate.** Every rate carries a 95% **Wilson** interval (not
   Wald — n is tiny and rates sit at the 0% boundary).
2. **The grader is external to the thing graded.** Rite's oracle is a
   *deterministic shell* (`true`/`false` exit code), not an LLM judge — so the
   grader cannot exhibit self-preference bias. (If an LLM verifier is added, it
   itself becomes an object of evaluation and must be calibrated against a human
   gold set first.)
3. **Reduce the meta-layer to a measurable classifier.** Evidence gate = "done
   claim classifier": positive = forged done (should reject), negative = genuine
   done (should pass). Report the GuardBench-standard metrics
   (precision/recall/F1/MCC) alongside FAR/FRR.
4. **Isolate the scaffold's contribution with a controlled A/B.** Hold
   everything fixed and toggle only the meta-layer (`--run-tests`).
5. **Disclose limits first.** n, circularity, synthetic origin, MDE — stated up
   front. Removing self-eval bias *starts* with naming your own weaknesses.
6. **Determinism is an asset.** No LLM/network/seed needed → 100% reproducible.

## 3. Experiment 1 — Evidence-gate efficacy (FAR/FRR ablation)

**Design.** `rite validate` classifies 9 hand-built cases (6 forged + 3 genuine)
under two conditions: `--run-tests` **OFF** (trusts the card's "PASS" text) vs
**ON** (executes the real test command). Seed-matched, same cases, only the
meta-layer toggled. Harness: [`src/eval/far-ablation.ts`](../src/eval/far-ablation.ts);
stats: [`src/core/stats.ts`](../src/core/stats.ts).

**Per-case result** (✗ = error):

| case | kind | OFF | ON | gate rule expected to catch it |
|------|------|-----|-----|--------------------------------|
| F1-false-pass | forged | accept ✗ | reject | run-tests (real exit code) |
| F2-forged-card | forged | reject | reject | required sections |
| F3-self-approval | forged | reject | reject | reviewer != owner |
| F4-missing-sections | forged | reject | reject | required sections |
| F5-cross-contamination | forged | reject | reject | canonical `## Task` match |
| F6-story-rename | forged | reject | reject | evidence required (tasks.yaml membership) |
| G1-complete | genuine | accept | accept | — |
| G2-two-done | genuine | accept | accept | — |
| G3-waived | genuine | accept | accept | — |

**Metrics** (positive class = forged; lower FAR is better):

| condition | FAR (false-accept) | FRR (false-reject) | Precision | Recall | F1 | MCC |
|-----------|--------------------|--------------------|-----------|--------|----|----|
| `--run-tests` OFF | **16.7%** (95% CI 3.0–56.4%, n=6) | 0.0% (CI 0.0–56.2%, n=3) | 1.00 | 0.83 | 0.91 | 0.79 |
| `--run-tests` ON  | **0.0%** (95% CI 0.0–39.0%, n=6) | 0.0% (CI 0.0–56.2%, n=3) | 1.00 | 1.00 | 1.00 | 1.00 |

## 4. Honest interpretation

- The **structural gate alone catches 5 of 6 forgeries** (F2–F6) with no test
  execution. Only the **false-PASS forgery (F1) requires `--run-tests` ON** —
  reading the card's "PASS" text is not enough; executing the real test is what
  closes it. That is the precise marginal value of `--run-tests`.
- **FRR is 0%** in both conditions — genuine dones are not over-blocked.
- **But the CIs are wide.** FAR-OFF 16.7% has a 95% CI of 3.0–56.4%, which
  *overlaps* the region near ON's 0% — with n=6 we cannot claim a large,
  statistically tight separation. The direction is right; the power is low.

## 5. Limitations (stated, not hidden)

- **n = 9, synthetic, single-author.** The forgeries are hand-built — which
  invites the **circularity** critique: "you only built forgeries you knew the
  gate would catch." Adding more synthetic cases raises power but not
  generalization.
- **Deterministic oracle ≠ real LLM behavior.** This proves the gate's logic
  under controlled inputs, not its behavior on the natural distribution of
  forgeries a real agent produces.
- **No LLM verifier yet**, so self-preference / family bias / calibration are
  not measured (they don't exist in a shell-oracle gate, but would once an LLM
  judge is introduced).

## 6. Roadmap — what would make this airtight (and what it costs)

| Next experiment | Closes which gap | Needs |
|-----------------|------------------|-------|
| Per-rule ablation (toggle each gate rule) | which rule catches which forgery, causally | synthetic-now |
| External forgery set (GuardBench-style) | over-fitting to my own cases | synthetic + design |
| **Real LLM A/B** (Rite on/off, real Claude/Codex runner, external grader) | "does Rite improve/stabilize real outcomes" — pass^k, regression, cost overhead | **API budget** |
| Real-run forgery gold set + human labels | the key generalization claim; out-of-sample FAR | **human labeling (κ≥0.6)** |
| LLM-verifier calibration (judge↔human κ, ECE) | trust of any LLM judge | LLM + human gold set |

## 7. Reproducibility

```bash
npm test                          # 60 tests incl. stats + adversarial gate
node dist/eval/far-ablation.js    # regenerates the table + eval/far-results.json
```

- **Deterministic:** no LLM, no network, no seed — `true`/`false` shell oracle.
- **Versioned:** `EVAL_VERSION` constant bumps on scoring change; results JSON
  records git short hash + Node version (lm-evaluation-harness convention).
- **Open:** the harness, the cases (`helpers.ts` `fullCard()` + each `setup`),
  and the per-case log (`eval/far-results.json`) are all in-repo — re-run
  without trusting this document.

## 8. Recommended stack (for the LLM-A/B stage)

Borrowed conventions from the standard tooling, to adopt when LLM evaluation is
added: **UK AISI Inspect** as the agent harness (`.eval` logs capture seed +
full transcript + tool calls), **lm-evaluation-harness** VERSION/seed/log
conventions (already applied here), **promptfoo + GitHub Action** for trajectory
regression gates in CI, and **HELM**-style versioned leaderboards (publish every
request/response + a reproduce command). Self-host the open parts; cite
Braintrust/LangSmith only as lineage-schema references (closed SaaS).

---

*Methodology grounded in: arXiv 2506.02064 (measurement imbalance), Harness-Bench,
τ-bench (pass^k), METR time-horizon, GuardBench (FAR/FRR/MCC), EleutherAI
"Lessons from the Trenches" (reproducibility). Frontier-model-tracker figures are
time-sensitive and cited as of mid-2026.*
