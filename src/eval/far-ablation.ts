/**
 * Evaluation experiment 1 — Evidence-gate efficacy (FAR / FRR ablation).
 *
 * Treats `rite validate` as a CLASSIFIER of "done" claims:
 *   - positive = a forged/incomplete "done" that SHOULD be rejected
 *   - negative = a genuine "done" that SHOULD pass
 *
 * Reports two error rates under two conditions (--run-tests OFF vs ON):
 *   FAR = false-accept rate  = forged dones that PASSED   (lower is better)
 *   FRR = false-reject rate  = genuine dones that REJECTED (operational friction)
 *
 * No LLM, no network — uses trivial shell commands (`true`/`false`) as the test
 * oracle and the real templates as the runtime. Run: node dist/eval/far-ablation.js
 */
import * as fs from 'fs';
import * as path from 'path';
import { runValidate } from '../commands/validate';
import { runCommand } from '../core/exec';
import { wilson, pct, classMetrics, Confusion } from '../core/stats';
import { makeRepo, rmRepo, setConfig, writeProject, fullCard, quiet } from '../__tests__/helpers';

/** Bump when scoring logic / case set changes (lm-eval VERSION convention). */
const EVAL_VERSION = 1;

type Kind = 'forged' | 'genuine';
interface Case {
  id: string;
  kind: Kind;
  note: string;
  setup: (repo: string) => void;
}

/** Which gate rule is expected to catch each forged case (per-rule mapping). */
const EXPECTED_RULE: Record<string, string> = {
  'F1-false-pass': 'run-tests (real exit code)',
  'F2-forged-card': 'required sections',
  'F3-self-approval': 'reviewer != owner',
  'F4-missing-sections': 'required sections',
  'F5-cross-contamination': 'canonical ## Task match',
  'F6-story-rename': 'evidence required (tasks.yaml membership)',
};

const board = (lanes: string) => `project: p\nlanes:\n${lanes}`;
const tasks = (id: string, status = 'done', owner = 'builder', reviewer = 'verifier') =>
  `project: p\ntasks:\n  - id: ${id}\n    status: ${status}\n    owner: ${owner}\n    reviewer: ${reviewer}\n`;

const CASES: Case[] = [
  // ---- forged "done"s (gate SHOULD reject) ----
  {
    id: 'F1-false-pass',
    kind: 'forged',
    note: 'card says PASS but the real test command fails',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'false' } }); // tests actually fail
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001', { testResult: 'PASS (all green)' }) }],
      });
    },
  },
  {
    id: 'F2-forged-card',
    kind: 'forged',
    note: 'one-line card: ## Task only, no required sections',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: '## Task\ntask-001\nApproved.\n' }],
      });
    },
  },
  {
    id: 'F3-self-approval',
    kind: 'forged',
    note: 'evidence reviewer == task owner (self-approval)',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001', { reviewer: 'builder' }) }],
      });
    },
  },
  {
    id: 'F4-missing-sections',
    kind: 'forged',
    note: 'card lacks Acceptance Mapping + Test Result sections',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      const card = `# Evidence Card: task-001\n## Task\ntask-001\n## Owner\nbuilder\n## Reviewer\nverifier\n## Reviewer Verdict\nApproved.\n`;
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: card }],
      });
    },
  },
  {
    id: 'F5-cross-contamination',
    kind: 'forged',
    note: "only card is for task-002 but mentions task-001 in its body",
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-002-evidence.md', content: fullCard('task-002') + '\nbuilds on task-001\n' }],
      });
    },
  },
  {
    id: 'F6-story-rename',
    kind: 'forged',
    note: 'done item named like a story but is a real task with no card',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - feature-login\n'),
        tasks: tasks('feature-login'),
      });
    },
  },
  // ---- genuine "done"s (gate SHOULD pass) ----
  {
    id: 'G1-complete',
    kind: 'genuine',
    note: 'complete card, distinct reviewer, tests pass',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001') }],
      });
    },
  },
  {
    id: 'G2-two-done',
    kind: 'genuine',
    note: 'two genuine done tasks each with a complete card',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n    - task-002\n'),
        tasks:
          `project: p\ntasks:\n` +
          `  - id: task-001\n    status: done\n    owner: builder\n    reviewer: verifier\n` +
          `  - id: task-002\n    status: done\n    owner: builder\n    reviewer: verifier\n`,
        evidence: [
          { file: 'task-001-evidence.md', content: fullCard('task-001') },
          { file: 'task-002-evidence.md', content: fullCard('task-002') },
        ],
      });
    },
  },
  {
    id: 'G3-waived',
    kind: 'genuine',
    note: 'card with an explicit test waiver (no test command failure)',
    setup: (repo) => {
      setConfig(repo, { commands: { test: 'true' } });
      writeProject(repo, 'p', {
        board: board('  done:\n    - task-001\n'),
        tasks: tasks('task-001'),
        evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001', { testResult: 'WAIVED — no runtime change' }) }],
      });
    },
  },
];

function classify(c: Case, runTests: boolean): 'accept' | 'reject' {
  const repo = makeRepo();
  try {
    c.setup(repo);
    return quiet(() => runValidate({ cwd: repo, runTests })) === 0 ? 'accept' : 'reject';
  } finally {
    rmRepo(repo);
  }
}

interface Row {
  id: string;
  kind: Kind;
  note: string;
  rule: string | null;
  off: 'accept' | 'reject';
  on: 'accept' | 'reject';
}

/** Confusion matrix for one condition. positive class = forged (should reject). */
function confusion(rows: Row[], cond: 'off' | 'on'): Confusion {
  const c: Confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  for (const r of rows) {
    const rejected = r[cond] === 'reject';
    if (r.kind === 'forged') rejected ? c.tp++ : c.fn++;
    else rejected ? c.fp++ : c.tn++;
  }
  return c;
}

function condReport(rows: Row[], cond: 'off' | 'on') {
  const c = confusion(rows, cond);
  const m = classMetrics(c);
  const nForged = c.tp + c.fn;
  const nGenuine = c.tn + c.fp;
  return {
    confusion: c,
    metrics: m,
    farCI: wilson(c.fn, nForged), // false-accept rate over forged
    frrCI: wilson(c.fp, nGenuine), // false-reject rate over genuine
  };
}

function gitHash(): string {
  const r = runCommand('git rev-parse --short HEAD', { cwd: process.cwd() });
  return r.exitCode === 0 ? r.stdout.trim() : 'unknown';
}

function main() {
  const rows: Row[] = CASES.map((c) => ({
    id: c.id,
    kind: c.kind,
    note: c.note,
    rule: c.kind === 'forged' ? EXPECTED_RULE[c.id] ?? '(unmapped)' : null,
    off: classify(c, false),
    on: classify(c, true),
  }));

  const off = condReport(rows, 'off');
  const on = condReport(rows, 'on');

  // per-case table
  console.log('\nFAR/FRR ablation — rite validate as a classifier of "done" claims\n');
  console.log('case                   kind     OFF        ON         expected rule / note');
  console.log('---------------------- -------- ---------- ---------- ---------------------');
  for (const r of rows) {
    const err = (v: string) => (r.kind === 'forged' ? v === 'accept' : v === 'reject');
    const cell = (v: string) => (v + (err(v) ? ' ✗' : '')).padEnd(10);
    const tail = r.kind === 'forged' ? r.rule : r.note;
    console.log(`${r.id.padEnd(22)} ${r.kind.padEnd(8)} ${cell(r.off)} ${cell(r.on)} ${tail}`);
  }

  const line = (label: string, rep: ReturnType<typeof condReport>) => {
    const m = rep.metrics;
    console.log(
      `  ${label}: FAR ${pct(rep.farCI)} | FRR ${pct(rep.frrCI)} | ` +
        `P ${m.precision.toFixed(2)} R ${m.recall.toFixed(2)} F1 ${m.f1.toFixed(2)} MCC ${m.mcc.toFixed(2)}`
    );
  };
  console.log('\nMetrics (positive class = forged "done"; lower FAR better):');
  line('--run-tests OFF', off);
  line('--run-tests ON ', on);
  console.log('\nNote: with n=6 forged / n=3 genuine the CIs are wide — see EVALUATION.md for the honest caveat.\n');

  const outDir = path.join(process.cwd(), 'eval');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'far-results.json'),
    JSON.stringify(
      {
        metadata: {
          evalVersion: EVAL_VERSION,
          gitHash: gitHash(),
          node: process.version,
          generatedFrom: 'src/eval/far-ablation.ts',
          oracle: 'deterministic shell (true/false) — no LLM, no network, no seed needed',
          nForged: rows.filter((r) => r.kind === 'forged').length,
          nGenuine: rows.filter((r) => r.kind === 'genuine').length,
        },
        rows,
        off,
        on,
      },
      null,
      2
    )
  );
  console.log('  wrote eval/far-results.json');
}

main();
