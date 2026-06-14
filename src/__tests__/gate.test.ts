import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { runLoop } from '../commands/loop';
import { readYaml } from '../core/yaml';
import { makeRepo, rmRepo, setConfig, setState, writeProject, fullCard, quiet } from './helpers';

const NOW = '2026-02-02T00:00:00Z';

function boardYaml(): string {
  return `project: p
lanes:
  ready:
    - task-001
  review: []
  done: []
`;
}
function tasksYaml(id = 'task-001'): string {
  return `project: p
tasks:
  - id: ${id}
    status: ready
    autonomy: auto
    owner: builder
    reviewer: verifier
`;
}
function lanes(repo: string): Record<string, string[]> {
  const b = readYaml<{ lanes?: Record<string, string[]> }>(
    path.join(repo, '.rite', 'projects', 'p', 'board.yaml')
  );
  return b?.lanes ?? {};
}

test('PROMOTE: no-op runner + complete evidence + tests pass → task in done lane', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { commands: { test: 'true' }, loop: { runner: 'true', max_iterations_per_run: 4, max_consecutive_failures: 2 } });
    writeProject(repo, 'p', {
      board: boardYaml(),
      tasks: tasksYaml(),
      evidence: [{ file: 'task-001-evidence.md', content: fullCard('task-001') }],
    });
    const code = quiet(() => runLoop({ cwd: repo, now: NOW }));
    assert.equal(code, 0);
    assert.ok((lanes(repo).done ?? []).includes('task-001'), 'task-001 should be promoted to done');
  } finally {
    rmRepo(repo);
  }
});

test('FAIL→rollback: no-op runner, no evidence → task back in review, not done', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { commands: { test: 'true' }, loop: { runner: 'true', max_iterations_per_run: 4, max_consecutive_failures: 5 } });
    writeProject(repo, 'p', { board: boardYaml(), tasks: tasksYaml() }); // no evidence
    const code = quiet(() => runLoop({ cwd: repo, now: NOW }));
    assert.equal(code, 0); // 1 failure < cap 5, then no eligible
    assert.ok((lanes(repo).review ?? []).includes('task-001'), 'task-001 rolled back to review');
    assert.ok(!(lanes(repo).done ?? []).includes('task-001'), 'must NOT be done');
  } finally {
    rmRepo(repo);
  }
});

test('runner prints SUCCESS but produces no evidence → still FAIL (text is not the judge)', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { commands: { test: 'true' }, loop: { runner: 'echo SUCCESS-DONE', max_iterations_per_run: 4, max_consecutive_failures: 5 } });
    writeProject(repo, 'p', { board: boardYaml(), tasks: tasksYaml() });
    const code = quiet(() => runLoop({ cwd: repo, now: NOW }));
    assert.equal(code, 0);
    assert.ok(!(lanes(repo).done ?? []).includes('task-001'), 'runner stdout must not promote');
  } finally {
    rmRepo(repo);
  }
});

test('consecutive failures reach cap → HOLD (exit 2)', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { commands: { test: 'true' }, loop: { runner: 'true', max_iterations_per_run: 6, max_consecutive_failures: 2 } });
    const board = `project: p
lanes:
  ready:
    - task-001
    - task-002
  review: []
  done: []
`;
    const tasks = `project: p
tasks:
  - id: task-001
    status: ready
    autonomy: auto
    owner: builder
    reviewer: verifier
  - id: task-002
    status: ready
    autonomy: auto
    owner: builder
    reviewer: verifier
`;
    writeProject(repo, 'p', { board, tasks }); // no evidence for either → both FAIL
    const code = quiet(() => runLoop({ cwd: repo, now: NOW }));
    assert.equal(code, 2, 'two consecutive failures with cap 2 → HOLD exit 2');
  } finally {
    rmRepo(repo);
  }
});
