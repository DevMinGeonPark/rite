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

const TASKS_OK = `project: p
tasks:
  - id: task-001
    owner: builder
    reviewer: verifier
`;

function boardWithLanes(lanes: string): string {
  return `project: p\nlanes:\n${lanes}`;
}

test('validate: clean install with no project → valid (exit 0)', () => {
  const repo = makeRepo();
  try {
    assert.equal(runQuiet(repo), 0);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: done task WITH evidence + distinct reviewer → valid', () => {
  const repo = makeRepo();
  try {
    writeProject(
      repo,
      'p',
      boardWithLanes('  done:\n    - task-001\n'),
      TASKS_OK,
      { file: 'task-001-evidence.md', content: '# Evidence\ntask-001\nApproved.' }
    );
    assert.equal(runQuiet(repo), 0);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: done task WITHOUT evidence → invalid (no evidence, no done)', () => {
  const repo = makeRepo();
  try {
    writeProject(repo, 'p', boardWithLanes('  done:\n    - task-001\n'), TASKS_OK);
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: owner === reviewer → invalid (separation of duties)', () => {
  const repo = makeRepo();
  try {
    const tasksSameOwner = `project: p
tasks:
  - id: task-001
    owner: builder
    reviewer: builder
`;
    writeProject(
      repo,
      'p',
      boardWithLanes('  done:\n    - task-001\n'),
      tasksSameOwner,
      { file: 'task-001-evidence.md', content: 'task-001' }
    );
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('validate: same task in two lanes → invalid (lane consistency)', () => {
  const repo = makeRepo();
  try {
    writeProject(
      repo,
      'p',
      boardWithLanes('  ready:\n    - task-001\n  done:\n    - task-001\n'),
      TASKS_OK,
      { file: 'task-001-evidence.md', content: 'task-001' }
    );
    assert.equal(runQuiet(repo), 1);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
