import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { runValidate } from '../commands/validate';
import { riteTemplate } from '../core/paths';
import { copyTree } from '../core/fs';

let counter = 0;

/** Fresh repo with a clean .rite/ copied from the real templates. */
function makeRepo(): string {
  const dir = path.join(os.tmpdir(), `rite-val-test-${process.pid}-${counter++}`);
  fs.mkdirSync(dir, { recursive: true });
  copyTree(riteTemplate(), path.join(dir, '.rite'));
  return dir;
}

function writeProject(
  repo: string,
  id: string,
  board: string,
  tasks: string,
  evidence?: { file: string; content: string }
): void {
  const p = path.join(repo, '.rite', 'projects', id);
  fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(p, 'board.yaml'), board);
  fs.writeFileSync(path.join(p, 'tasks.yaml'), tasks);
  if (evidence) {
    fs.mkdirSync(path.join(p, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(p, 'evidence', evidence.file), evidence.content);
  }
}

/** Run validate without spewing its report into the test output. */
function runQuiet(cwd: string): number {
  const orig = console.log;
  console.log = () => {};
  try {
    return runValidate({ cwd });
  } finally {
    console.log = orig;
  }
}

/** A complete, honest evidence card that should satisfy every gate. */
function fullCard(
  taskId: string,
  opts: { owner?: string; reviewer?: string; testResult?: string; omit?: string[] } = {}
): string {
  const owner = opts.owner ?? 'builder';
  const reviewer = opts.reviewer ?? 'verifier';
  const testResult = opts.testResult ?? 'PASS (3 tests, 0 failures)';
  const omit = new Set(opts.omit ?? []);
  const sections: string[] = [`# Evidence Card: ${taskId}`, ``, `## Task`, taskId];
  if (!omit.has('Owner')) sections.push(`## Owner`, owner);
  if (!omit.has('Reviewer')) sections.push(`## Reviewer`, reviewer);
  if (!omit.has('Acceptance Criteria Mapping'))
    sections.push(`## Acceptance Criteria Mapping`, `- [x] does the thing`);
  if (!omit.has('Test Result')) sections.push(`## Test Result`, testResult);
  if (!omit.has('Reviewer Verdict')) sections.push(`## Reviewer Verdict`, `Approved.`);
  return sections.join('\n') + '\n';
}

const TASKS_OK = `project: p
tasks:
  - id: task-001
    status: done
    owner: builder
    reviewer: verifier
`;

function boardWithLanes(lanes: string): string {
  return `project: p\nlanes:\n${lanes}`;
}

const DONE_LANE = '  done:\n    - task-001\n';

// ---------- happy paths ----------

test('validate: clean install with no project → valid (exit 0)', () => {
  const repo = makeRepo();
  try {
    assert.equal(runQuiet(repo), 0);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: done task with a complete card + distinct reviewer → valid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001'),
    });
    assert.equal(runQuiet(repo), 0);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------- original negative cases ----------

test('validate: done task WITHOUT any evidence → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK);
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: owner === reviewer in tasks.yaml → invalid', () => {
  const repo = makeRepo();
  try {
    const tasks = `project: p
tasks:
  - id: task-001
    status: done
    owner: builder
    reviewer: builder
`;
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), tasks, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001'),
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: same task in two lanes → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(
      repo,
      'p',
      boardWithLanes('  ready:\n    - task-001\n  done:\n    - task-001\n'),
      TASKS_OK,
      { file: 'task-001-evidence.md', content: fullCard('task-001') }
    );
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------- adversarial regression cases (the 6/4 findings) ----------

test('adversarial: forged one-line card (no ## Task / sections) → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-001-evidence.md',
      content: 'task-001\nApproved.\n', // the old bypass
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: card with ## Task but missing required sections → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001', { omit: ['Acceptance Criteria Mapping', 'Test Result'] }),
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: substring cross-contamination (card belongs to another task) → invalid', () => {
  const repo = makeRepo();
  try {
    // The only card is for task-002 but mentions "task-001" in its body.
    const card = fullCard('task-002') + '\nThis builds on task-001 and unblocks task-001.\n';
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-002-evidence.md',
      content: card,
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: story-* style rename does NOT bypass (tasks.yaml membership) → invalid', () => {
  const repo = makeRepo();
  try {
    // Item is named like a story but is a real task in tasks.yaml, marked done, with no card.
    const tasks = `project: p
tasks:
  - id: feature-login
    status: done
    owner: builder
    reviewer: verifier
`;
    writeProject(repo, 'p', boardWithLanes('  done:\n    - feature-login\n'), tasks);
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: self-approval (card reviewer == task owner) → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001', { reviewer: 'builder' }), // owner is builder
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: failing Test Result → invalid', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), TASKS_OK, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001', { testResult: 'FAIL (1 test failed)' }),
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: board done lane but tasks.yaml status not done → invalid', () => {
  const repo = makeRepo();
  try {
    const tasks = `project: p
tasks:
  - id: task-001
    status: in_progress
    owner: builder
    reviewer: verifier
`;
    writeProject(repo, 'p', boardWithLanes(DONE_LANE), tasks, {
      file: 'task-001-evidence.md',
      content: fullCard('task-001'),
    });
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('adversarial: blocked task sitting in ready lane → invalid', () => {
  const repo = makeRepo();
  try {
    const board = `project: p
lanes:
  ready:
    - task-001
blockers:
  - id: blocker-001
    task: task-001
    status: open
`;
    const tasks = `project: p
tasks:
  - id: task-001
    status: ready
    owner: builder
    reviewer: verifier
`;
    writeProject(repo, 'p', board, tasks);
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
