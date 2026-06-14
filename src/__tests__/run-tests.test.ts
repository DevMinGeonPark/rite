import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runValidate } from '../commands/validate';
import { makeRepo, rmRepo, setConfig, writeProject, fullCard, quiet } from './helpers';

const TASKS = `project: p
tasks:
  - id: task-001
    status: done
    owner: builder
    reviewer: verifier
`;
const BOARD_DONE = `project: p
lanes:
  done:
    - task-001
`;

function withEvidence(testResult?: string) {
  return {
    board: BOARD_DONE,
    tasks: TASKS,
    evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001', { testResult }) }],
  };
}

test('run-tests: passing command (true) → valid', () => {
  const repo = makeRepo();
  try {
    setConfig(repo, { commands: { test: 'true' } });
    writeProject(repo, 'p', withEvidence());
    assert.equal(quiet(() => runValidate({ cwd: repo, runTests: true })), 0);
  } finally {
    rmRepo(repo);
  }
});

test('run-tests: failing command (false) → invalid (exit 1)', () => {
  const repo = makeRepo();
  try {
    setConfig(repo, { commands: { test: 'false' } });
    writeProject(repo, 'p', withEvidence());
    assert.equal(quiet(() => runValidate({ cwd: repo, runTests: true })), 1);
  } finally {
    rmRepo(repo);
  }
});

test('run-tests: missing commands.test with --run-tests → invalid', () => {
  const repo = makeRepo();
  try {
    setConfig(repo, { commands: {} });
    writeProject(repo, 'p', withEvidence());
    assert.equal(quiet(() => runValidate({ cwd: repo, runTests: true })), 1);
  } finally {
    rmRepo(repo);
  }
});

test('run-tests: evidence claims PASS but tests fail → invalid (hallucinated evidence)', () => {
  const repo = makeRepo();
  try {
    setConfig(repo, { commands: { test: 'false' } });
    writeProject(repo, 'p', withEvidence('PASS (all green)'));
    // exit 1 because the real command fails AND a card claims PASS
    assert.equal(quiet(() => runValidate({ cwd: repo, runTests: true })), 1);
  } finally {
    rmRepo(repo);
  }
});

test('without --run-tests: failing test command is NOT run → still valid', () => {
  const repo = makeRepo();
  try {
    setConfig(repo, { commands: { test: 'false' } }); // would fail IF run
    writeProject(repo, 'p', withEvidence());
    assert.equal(quiet(() => runValidate({ cwd: repo })), 0);
  } finally {
    rmRepo(repo);
  }
});
